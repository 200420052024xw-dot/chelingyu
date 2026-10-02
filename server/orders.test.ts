import assert from "node:assert/strict";
import { test } from "node:test";
import type { DeliveryAddressSnapshot, OrderDraft, Quote } from "../miniprogram/contracts/types";
import { computeInputFingerprint } from "../miniprogram/domain/pricing";
import { acceptQuote, createOrder, customerConfirm, dispatch, eligibleVehicles, payMock, progress, review } from "./orders";
import { canOperateOrder, canSeeOrder, priceFor, seedState } from "./state";

const password="a-strong-test-password";
const address=(name:string,latitude:number,longitude:number):DeliveryAddressSnapshot=>({name,detail:`${name}测试地址`,contactName:"测试联系人",contactMobile:"13800000000",regionCode:"360100",location:{latitude,longitude}});
function input(options:{scheduled?:boolean;modelId?:string;sender?:DeliveryAddressSnapshot;receiver?:DeliveryAddressSnapshot;requestId?:string}={}){
  const sender=options.sender||address("瑶湖",28.6829,115.8582);
  const receiver=options.receiver||address("东湖",28.6832,115.9002);
  const modelId=options.modelId||"z2";
  const scheduledAt=new Date(Date.now()+20*60_000).toISOString();
  const draft:OrderDraft={id:"draft-test",userId:"old-device-user",revision:1,sender,receiver,serviceTimeMode:options.scheduled?"scheduled":"immediate",scheduledPickupAt:options.scheduled?scheduledAt:undefined,cargo:{category:"general",description:"测试货物",quantity:1,unitWeightGrams:1000,fragile:false,needsHandling:false},selectedVehicleModelId:modelId,dispatchSource:options.scheduled?"headquarters":"nearby",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  const state=seedState(password);
  const pricing=priceFor(sender,receiver,draft.cargo!,state.models.find(m=>m.id===modelId)!);
  const quote:Quote={id:`quote-${options.requestId||"one"}`,orderDraftId:draft.id,draftRevision:1,inputFingerprint:computeInputFingerprint(draft,modelId),customerId:draft.userId,vehicleModelId:modelId,pricingPolicyId:"pricing_qh",pricingPolicyVersion:1,routeDistanceMeters:5000,estimatedArrivalMinutes:5,items:pricing.items,totalAmountFen:pricing.total,expiresAt:new Date(Date.now()+5*60000).toISOString(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  return {draft,quote,requestId:options.requestId||"one"};
}

test("cross-district order belongs to pickup district; destination is read-only",()=>{
  const state=seedState(password);
  const order=createOrder(state,"demo-user",input({scheduled:true}));
  assert.equal(order.serviceRegionId,"service_yaohu");
  assert.equal(order.destinationServiceRegionId,"service_donghu");
  assert.equal(order.status,"pending_dispatch_review");
  const pickup=state.admins.find(a=>a.username==="yaohu")!;
  const destination=state.admins.find(a=>a.username==="donghu")!;
  const city=state.admins.find(a=>a.username==="nanchang")!;
  assert.equal(canOperateOrder(state,pickup,order),true);
  assert.equal(canSeeOrder(state,destination,order),true);
  assert.equal(canOperateOrder(state,destination,order),false);
  assert.equal(canSeeOrder(state,city,order),true);
});

test("review, mock payment, reserve real vehicle and customer confirmations",()=>{
  const state=seedState(password);
  const district=state.admins.find(a=>a.username==="yaohu")!;
  const order=createOrder(state,"demo-user",input({scheduled:true}));
  review(state,district,order.id,"approved");
  assert.equal(order.status,"pending_payment");
  payMock(state,"demo-user",order.id,"pay-one","success");
  assert.equal(order.status,"scheduled");
  assert.ok(eligibleVehicles(state,order).some(v=>v.id==="cly-001"));
  dispatch(state,district,order.id,"cly-001");
  assert.equal(order.status,"dispatched");
  const second=createOrder(state,"demo-user",input({scheduled:true,requestId:"two"}));
  review(state,district,second.id,"approved");
  payMock(state,"demo-user",second.id,"pay-two","success");
  assert.equal(eligibleVehicles(state,second).some(v=>v.id==="cly-001"),false);
  assert.throws(()=>dispatch(state,district,second.id,"cly-001"),/车辆当前不符合/);
  progress(state,district,order.id,"vehicle_to_pickup");
  progress(state,district,order.id,"awaiting_loading");
  customerConfirm(state,"demo-user",order.id,"loaded");
  progress(state,district,order.id,"arrived");
  customerConfirm(state,"demo-user",order.id,"received");
  assert.equal(order.status,"completed");
  assert.equal(state.vehicles.find(v=>v.id==="cly-001")?.status,"available");
  assert.equal(state.reservations.find(r=>r.orderId===order.id)?.status,"released");
});

test("unsuitable model stays reviewable and customer accepts revised quote",()=>{
  const state=seedState(password);
  const district=state.admins.find(a=>a.username==="yaohu")!;
  const payload=input({modelId:"z2"});
  payload.draft.cargo!.unitWeightGrams=300000;
  payload.quote.inputFingerprint=computeInputFingerprint(payload.draft,"z2");
  const order=createOrder(state,"demo-user",payload);
  assert.equal(order.status,"pending_dispatch_review");
  review(state,district,order.id,"approved","改用更大车型","z5-2026");
  assert.equal(order.status,"pending_customer_quote");
  assert.equal(order.vehicleSnapshot.vehicleModelId,"z2");
  acceptQuote(state,"demo-user",order.id);
  assert.equal(order.status,"pending_payment");
  assert.equal(order.vehicleSnapshot.vehicleModelId,"z5-2026");
});

test("order creation rejects a changed price or stale draft fingerprint",()=>{
  const state=seedState(password);
  const changed=input({requestId:"changed"});changed.quote.totalAmountFen+=100;
  assert.throws(()=>createOrder(state,"demo-user",changed),/价格已变更/);
  const stale=input({requestId:"stale"});stale.draft.sender!.location.longitude+=0.01;
  assert.throws(()=>createOrder(state,"demo-user",stale),/报价已过期/);
  assert.equal(state.orders.length,0);
});
