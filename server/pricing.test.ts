import assert from "node:assert/strict";
import { test } from "node:test";
import { pricingStatus, quoteFor, savePricing } from "./pricing";
import { seedState } from "./state";
import type { DeliveryAddressSnapshot } from "../miniprogram/contracts/types";

const address=(name:string,longitude:number):DeliveryAddressSnapshot=>({name,detail:name,contactName:"测试",contactMobile:"13800000000",regionCode:"360100",location:{latitude:28.6829,longitude}});

test("regional price ranges constrain each level and preserve existing rates until district changes them",()=>{
  const state=seedState("a-strong-test-password");
  const hq=state.admins.find(a=>a.level==="headquarters")!;
  const province=state.admins.find(a=>a.level==="province")!;
  const city=state.admins.find(a=>a.level==="city")!;
  const district=state.admins.find(a=>a.level==="district")!;
  const cargo={category:"general" as const,description:"文件",quantity:1,fragile:false,needsHandling:false};
  const model=state.models[0];
  const initial=quoteFor(state,address("瑶湖",115.8582),address("附近",115.8602),cargo,model);
  assert.equal(initial.items[0].amountFen,500);
  savePricing(state,hq,{ranges:{baseFeeFen:{min:400,max:600},distanceFeeFenPerKm:{min:150,max:250},coldChainFeeFen:{min:80,max:120}}});
  savePricing(state,province,{ranges:{baseFeeFen:{min:450,max:550},distanceFeeFenPerKm:{min:180,max:220},coldChainFeeFen:{min:90,max:110}}});
  savePricing(state,city,{ranges:{baseFeeFen:{min:480,max:520},distanceFeeFenPerKm:{min:190,max:210},coldChainFeeFen:{min:95,max:105}}});
  savePricing(state,district,{values:{baseFeeFen:510,distanceFeeFenPerKm:205,coldChainFeeFen:100}});
  assert.equal(state.pricingHistory.length,4);
  assert.equal(state.pricingHistory.at(-1)?.actorId,district.id);
  assert.equal(quoteFor(state,address("瑶湖",115.8582),address("附近",115.8602),cargo,model).items[0].amountFen,510);
  assert.throws(()=>savePricing(state,city,{ranges:{baseFeeFen:{min:300,max:520},distanceFeeFenPerKm:{min:190,max:210},coldChainFeeFen:{min:95,max:105}}}),/超出上级/);
  savePricing(state,hq,{ranges:{baseFeeFen:{min:400,max:505},distanceFeeFenPerKm:{min:150,max:250},coldChainFeeFen:{min:80,max:120}}});
  assert.equal(pricingStatus(state,"nanchang_county").valid,false);
  assert.throws(()=>quoteFor(state,address("瑶湖",115.8582),address("附近",115.8602),cargo,model),/价格待调整/);
});
