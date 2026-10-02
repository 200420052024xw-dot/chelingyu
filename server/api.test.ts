import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "./index";
import { seedState, StateStore } from "./state";

test("API requires identity and administrator role",async()=>{
  const store=new StateStore(seedState("a-strong-test-password"));
  const server=createApp(store,{secret:"test-secret-at-least-thirty-two-characters",demoAuth:true,production:false}).listen(0,"127.0.0.1");
  try{
    await new Promise<void>(resolve=>server.once("listening",resolve));
    const address=server.address();
    if(!address||typeof address==="string")throw new Error("missing test port");
    const base=`http://127.0.0.1:${address.port}`;
    const without=await fetch(`${base}/api/admin/dashboard`);
    assert.equal(without.status,401);
    const login=await fetch(`${base}/api/admin/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"yaohu",password:"a-strong-test-password"})});
    assert.equal(login.status,200);
    const cookie=login.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    const dashboard=await fetch(`${base}/api/admin/dashboard`,{headers:{Cookie:cookie}});
    assert.equal(dashboard.status,200);
    const demo=await fetch(`${base}/api/auth/demo`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
    assert.equal(demo.status,200);
    const token=(await demo.json()).data.token;
    const sender={name:"瑶湖",detail:"测试寄件地址",contactName:"甲",contactMobile:"13800000000",regionCode:"360100",location:{latitude:28.6829,longitude:115.8582}};
    const receiver={...sender,name:"附近",detail:"测试收件地址",location:{latitude:28.683,longitude:115.8602}};
    const draft={id:"draft-api",userId:"device-user",revision:1,sender,receiver,serviceTimeMode:"immediate",cargo:{category:"general",description:"文件",quantity:1,fragile:false,needsHandling:false},selectedVehicleModelId:"z2",dispatchSource:"nearby",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    const quoted=await fetch(`${base}/api/quotes`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({draft,modelId:"z2"})});
    assert.equal(quoted.status,200);
    const quote=(await quoted.json()).data;
    const created=await fetch(`${base}/api/orders`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({draft,quote,requestId:"api-quote-one"})});
    assert.equal(created.status,201);
    assert.equal((await created.json()).data.totalAmountFen,quote.totalAmountFen);
    const customerOnAdmin=await fetch(`${base}/api/admin/dashboard`,{headers:{Authorization:`Bearer ${token}`}});
    assert.equal(customerOnAdmin.status,403);
    const districtAccounts=await fetch(`${base}/api/admin/accounts`,{headers:{Cookie:cookie}});
    assert.equal(districtAccounts.status,403);
    const hqLogin=await fetch(`${base}/api/admin/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"admin",password:"a-strong-test-password"})});
    const hqCookie=hqLogin.headers.get("set-cookie")?.split(";")[0];
    assert.ok(hqCookie);
    const forbiddenCreate=await fetch(`${base}/api/admin/accounts`,{method:"POST",headers:{"Content-Type":"application/json",Cookie:hqCookie},body:JSON.stringify({username:"new_district",name:"新区运营",password:"another-strong-password",level:"district",regionId:"donghu"})});
    assert.equal(forbiddenCreate.status,400);
    const cityLogin=await fetch(`${base}/api/admin/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"nanchang",password:"a-strong-test-password"})});
    const cityCookie=cityLogin.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cityCookie);
    const create=await fetch(`${base}/api/admin/accounts`,{method:"POST",headers:{"Content-Type":"application/json",Cookie:cityCookie},body:JSON.stringify({username:"new_district",name:"新区运营",password:"another-strong-password",level:"district",regionId:"donghu"})});
    assert.equal(create.status,201);
    const regionalLogin=await fetch(`${base}/api/admin/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"new_district",password:"another-strong-password"})});
    assert.equal(regionalLogin.status,200);
  }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await store.close();}
});

test("server route mileage prices quote and client cannot alter the saved quote",async()=>{
  const store=new StateStore(seedState("a-strong-test-password"));
  const mapsRequester:typeof fetch=async input=>{
    const url=String(input);
    const body=url.includes("/direction/")?{status:0,result:{routes:[{distance:8000,duration:20}]}}:{status:0,result:{ad_info:{adcode:"360121"}}};
    return new Response(JSON.stringify(body));
  };
  const server=createApp(store,{secret:"test-secret-at-least-thirty-two-characters",mapsKey:"test-key",mapsRequester,demoAuth:true,production:false}).listen(0,"127.0.0.1");
  try{
    await new Promise<void>(resolve=>server.once("listening",resolve));
    const address=server.address();if(!address||typeof address==="string")throw new Error("missing port");
    const base=`http://127.0.0.1:${address.port}`;
    const login=await fetch(`${base}/api/auth/demo`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
    const token=(await login.json()).data.token;
    const sender={name:"瑶湖",detail:"取货",contactName:"甲",contactMobile:"13800000000",regionCode:"360100",location:{latitude:28.6829,longitude:115.8582}};
    const receiver={...sender,name:"附近",detail:"送达",location:{latitude:28.683,longitude:115.8602}};
    const draft={id:"draft-map",userId:"device-user",revision:1,sender,receiver,serviceTimeMode:"immediate",cargo:{category:"general",description:"文件",quantity:1,fragile:false,needsHandling:false},selectedVehicleModelId:"z2",dispatchSource:"nearby",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    const headers={"Content-Type":"application/json",Authorization:`Bearer ${token}`};
    const quoteResponse=await fetch(`${base}/api/quotes`,{method:"POST",headers,body:JSON.stringify({draft,modelId:"z2"})});
    assert.equal(quoteResponse.status,200);
    const quote=(await quoteResponse.json()).data;
    assert.equal(quote.routeDistanceMeters,8000);
    assert.equal(quote.routeDurationMinutes,20);
    assert.equal(quote.estimatedArrivalMinutes,0);
    assert.equal(quote.totalAmountFen,2100);
    const forged={...quote,totalAmountFen:1,items:[{type:"base_fee",label:"免费",amountFen:1}]};
    const orderResponse=await fetch(`${base}/api/orders`,{method:"POST",headers,body:JSON.stringify({draft,quote:forged,requestId:"map-quote"})});
    assert.equal(orderResponse.status,201);
    const order=(await orderResponse.json()).data;
    assert.equal(order.totalAmountFen,2100);
    assert.equal(order.routeDistanceMeters,8000);
    assert.equal(order.routeDistanceSource,"tencent");
    assert.equal((await fetch(`${base}/api/orders`,{method:"POST",headers,body:JSON.stringify({draft,quote:{id:"invented"},requestId:"another"})})).status,409);
  }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await store.close();}
});

test("unroutable demand waits for district review and customer acceptance before payment",async()=>{
  const store=new StateStore(seedState("a-strong-test-password"));
  const mapsRequester:typeof fetch=async input=>new Response(JSON.stringify(String(input).includes("/direction/")?{status:0,result:{routes:[]}}:{status:0,result:{ad_info:{adcode:"360121"}}}));
  const server=createApp(store,{secret:"test-secret-at-least-thirty-two-characters",mapsKey:"test-key",mapsRequester,demoAuth:true,production:false}).listen(0,"127.0.0.1");
  try{
    await new Promise<void>(resolve=>server.once("listening",resolve));
    const address=server.address();if(!address||typeof address==="string")throw new Error("missing port");
    const base=`http://127.0.0.1:${address.port}`;
    const login=await fetch(`${base}/api/auth/demo`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
    const token=(await login.json()).data.token;
    const customerHeaders={"Content-Type":"application/json",Authorization:`Bearer ${token}`};
    const sender={name:"瑶湖",detail:"取货",contactName:"甲",contactMobile:"13800000000",regionCode:"360100",location:{latitude:28.6829,longitude:115.8582}};
    const receiver={...sender,name:"附近",detail:"送达",location:{latitude:28.683,longitude:115.8602}};
    const draft={id:"draft-review",userId:"device-user",revision:1,sender,receiver,serviceTimeMode:"immediate",cargo:{category:"general",description:"文件",quantity:1,fragile:false,needsHandling:false},selectedVehicleModelId:"z2",dispatchSource:"nearby",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    const quoteResponse=await fetch(`${base}/api/quotes`,{method:"POST",headers:customerHeaders,body:JSON.stringify({draft,modelId:"z2"})});
    assert.equal(quoteResponse.status,200);
    const quote=(await quoteResponse.json()).data;
    assert.equal(quote.routeReviewRequired,true);
    assert.equal(quote.totalAmountFen,0);
    const created=await fetch(`${base}/api/orders`,{method:"POST",headers:customerHeaders,body:JSON.stringify({draft,quote,requestId:"route-review"})});
    assert.equal(created.status,201);
    let order=(await created.json()).data;
    assert.equal(order.status,"pending_dispatch_review");
    assert.equal((await fetch(`${base}/api/orders/${order.id}/pay-mock`,{method:"POST",headers:customerHeaders,body:JSON.stringify({requestId:"too-early"})})).status,409);
    const cityLogin=await fetch(`${base}/api/admin/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"nanchang",password:"a-strong-test-password"})});
    const cityCookie=cityLogin.headers.get("set-cookie")!.split(";")[0];
    assert.equal((await fetch(`${base}/api/admin/orders/${order.id}/review`,{method:"POST",headers:{"Content-Type":"application/json",Cookie:cityCookie},body:JSON.stringify({decision:"approved",reason:"审核",manualDistanceMeters:8000,routeEvidence:"现场核实"})})).status,403);
    const districtLogin=await fetch(`${base}/api/admin/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"yaohu",password:"a-strong-test-password"})});
    const cookie=districtLogin.headers.get("set-cookie")!.split(";")[0];
    const adminHeaders={"Content-Type":"application/json",Cookie:cookie};
    const approve=(body:unknown)=>fetch(`${base}/api/admin/orders/${order.id}/review`,{method:"POST",headers:adminHeaders,body:JSON.stringify(body)});
    assert.equal((await approve({decision:"approved",reason:"核实可通行",manualDistanceMeters:8000})).status,400);
    const reviewed=await approve({decision:"approved",reason:"核实可通行",manualDistanceMeters:8000,routeEvidence:"经某道路绕行，现场核对"});
    assert.equal(reviewed.status,200);
    order=(await reviewed.json()).data;
    assert.equal(order.status,"pending_customer_quote");
    assert.equal(order.proposedTotalAmountFen,2100);
    assert.equal((await fetch(`${base}/api/orders/${order.id}/pay-mock`,{method:"POST",headers:customerHeaders,body:JSON.stringify({requestId:"still-early"})})).status,409);
    const accepted=await fetch(`${base}/api/orders/${order.id}/accept-quote`,{method:"POST",headers:customerHeaders,body:"{}"});
    assert.equal(accepted.status,200);
    order=(await accepted.json()).data;
    assert.equal(order.status,"pending_payment");
    assert.equal(order.routeDistanceSource,"manual");
    assert.equal(order.routeDistanceMeters,8000);
    assert.equal(order.totalAmountFen,2100);
    const paid=await fetch(`${base}/api/orders/${order.id}/pay-mock`,{method:"POST",headers:customerHeaders,body:JSON.stringify({requestId:"paid",scenario:"success"})});
    assert.equal(paid.status,200);
    assert.equal((await paid.json()).data.payment.amountFen,2100);
  }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await store.close();}
});

test("owner submits a vehicle for district review before it joins the fleet",async()=>{
  const store=new StateStore(seedState("a-strong-test-password"));
  const server=createApp(store,{secret:"test-secret-at-least-thirty-two-characters",demoAuth:true,production:false}).listen(0,"127.0.0.1");
  try {
    await new Promise<void>(resolve=>server.once("listening",resolve));
    const address=server.address();if(!address||typeof address==="string")throw new Error("missing port");
    const base=`http://127.0.0.1:${address.port}`;
    const customerLogin=await fetch(`${base}/api/auth/demo`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
    const customerToken=(await customerLogin.json()).data.token;
    const login=await fetch(`${base}/api/admin/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"yaohu",password:"a-strong-test-password"})});
    const districtCookie=login.headers.get("set-cookie")!.split(";")[0];
    const imageBase64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl7bXkAAAAASUVORK5CYII=";
    const submit=await fetch(`${base}/api/owner/vehicle-applications`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${customerToken}`},body:JSON.stringify({vehicleNo:"TEST-NEW-001",modelId:"z2",areaId:"service_yaohu",imageBase64})});
    assert.equal(submit.status,201);
    const application=(await submit.json()).data;
    const before=await fetch(`${base}/api/fleet`,{headers:{Authorization:`Bearer ${customerToken}`}});
    assert.equal((await before.json()).data.some((v:any)=>v.vehicleNo==="TEST-NEW-001"),false);
    const approved=await fetch(`${base}/api/admin/vehicle-applications/${application.id}/review`,{method:"POST",headers:{"Content-Type":"application/json",Cookie:districtCookie},body:JSON.stringify({decision:"approved"})});
    assert.equal(approved.status,200);
    const mine=await fetch(`${base}/api/owner/vehicles`,{headers:{Authorization:`Bearer ${customerToken}`}});
    assert.equal((await mine.json()).data.some((v:any)=>v.vehicle.vehicleNo==="TEST-NEW-001"),true);
    const districtUpload=await fetch(`${base}/api/admin/models/z2/image`,{method:"PUT",headers:{"Content-Type":"image/png",Cookie:districtCookie},body:Buffer.from(imageBase64,"base64")});
    assert.equal(districtUpload.status,403);
    const hqLogin=await fetch(`${base}/api/admin/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"admin",password:"a-strong-test-password"})});
    const hqCookie=hqLogin.headers.get("set-cookie")!.split(";")[0];
    const uploaded=await fetch(`${base}/api/admin/models/z2/image`,{method:"PUT",headers:{"Content-Type":"image/png",Cookie:hqCookie},body:Buffer.from(imageBase64,"base64")});
    assert.equal(uploaded.status,200);
    const imageUrl=(await uploaded.json()).data.imageUrl;
    assert.match(imageUrl,/^\/uploads\/[a-f0-9-]+\.png$/);
    assert.equal((await fetch(`${base}${imageUrl}`)).status,200);
  } finally {await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await store.close();}
});

test("headquarters creates Tangshan hierarchy and region view stays within account scope",async()=>{
  const store=new StateStore(seedState("a-strong-test-password"));
  const server=createApp(store,{secret:"test-secret-at-least-thirty-two-characters",demoAuth:true,production:false}).listen(0,"127.0.0.1");
  try {
    await new Promise<void>(resolve=>server.once("listening",resolve));
    const address=server.address();if(!address||typeof address==="string")throw new Error("missing port");
    const base=`http://127.0.0.1:${address.port}`;
    const login=async(username:string)=>{
      const response=await fetch(`${base}/api/admin/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password:"a-strong-test-password"})});
      assert.equal(response.status,200);
      return response.headers.get("set-cookie")!.split(";")[0];
    };
    const hq=await login("admin"),city=await login("nanchang");
    const create=async(cookie:string,body:unknown)=>fetch(`${base}/api/admin/regions`,{method:"POST",headers:{"Content-Type":"application/json",Cookie:cookie},body:JSON.stringify(body)});
    assert.equal((await create(city,{id:"hebei",name:"河北省",level:"province"})).status,403);
    for(const region of [
      {id:"hebei",name:"河北省",level:"province"},
      {id:"tangshan",name:"唐山市",level:"city",parentId:"hebei"},
      {id:"lubei",name:"路北区",level:"district",parentId:"tangshan"},
      {id:"lunan",name:"路南区",level:"district",parentId:"tangshan"},
    ]) assert.equal((await create(hq,region)).status,201);
    assert.equal((await create(hq,{id:"lubei",name:"重复",level:"district",parentId:"tangshan"})).status,409);
    const regions=await fetch(`${base}/api/admin/regions`,{headers:{Cookie:hq}}).then(r=>r.json());
    assert.equal(regions.data.regions.find((r:any)=>r.id==="lubei")?.cityId,"tangshan");
    assert.equal(regions.data.regions.find((r:any)=>r.id==="lubei")?.enabled,false);
    assert.equal(regions.data.areas.some((area:any)=>area.regionId==="lubei"),false);
    const publicRegions=await fetch(`${base}/api/regions`).then(r=>r.json());
    assert.equal(publicRegions.data.regions.some((r:any)=>r.id==="lubei"),false);
    const tangshanPricing=await fetch(`${base}/api/admin/pricing?regionId=tangshan`,{headers:{Cookie:hq}}).then(r=>r.json());
    assert.equal(tangshanPricing.data.editable,false);
    assert.equal(tangshanPricing.data.policy.regionId,"tangshan");
    const nanchangFleet=await fetch(`${base}/api/admin/fleet?regionId=nc`,{headers:{Cookie:hq}}).then(r=>r.json());
    const tangshanFleet=await fetch(`${base}/api/admin/fleet?regionId=tangshan`,{headers:{Cookie:hq}}).then(r=>r.json());
    assert.ok(nanchangFleet.data.length>0);
    assert.equal(tangshanFleet.data.length,0);
    assert.equal((await fetch(`${base}/api/admin/fleet?regionId=tangshan`,{headers:{Cookie:city}})).status,403);
    const newAccount=await fetch(`${base}/api/admin/accounts`,{method:"POST",headers:{"Content-Type":"application/json",Cookie:hq},body:JSON.stringify({username:"hebei_admin",name:"河北运营",password:"another-strong-password",level:"province",regionId:"hebei"})});
    assert.equal(newAccount.status,201);
    const hebeiAccounts=await fetch(`${base}/api/admin/accounts?regionId=hebei`,{headers:{Cookie:hq}}).then(r=>r.json());
    const jiangxiAccounts=await fetch(`${base}/api/admin/accounts?regionId=jx`,{headers:{Cookie:hq}}).then(r=>r.json());
    assert.deepEqual(hebeiAccounts.data.map((item:any)=>item.username),["hebei_admin"]);
    assert.equal(jiangxiAccounts.data.some((item:any)=>item.username==="hebei_admin"),false);
  } finally {await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await store.close();}
});

test("cooperation contact falls back from district through city and province to headquarters",async()=>{
  const store=new StateStore(seedState("a-strong-test-password"));
  const server=createApp(store,{secret:"test-secret-at-least-thirty-two-characters",demoAuth:true,production:false}).listen(0,"127.0.0.1");
  try {
    await new Promise<void>(resolve=>server.once("listening",resolve));
    const address=server.address();if(!address||typeof address==="string")throw new Error("missing port");
    const base=`http://127.0.0.1:${address.port}`;
    const login=async(username:string,password="a-strong-test-password")=>{
      const response=await fetch(`${base}/api/admin/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
      assert.equal(response.status,200);
      return response.headers.get("set-cookie")!.split(";")[0];
    };
    const submit=(url:string,cookie:string,body:unknown,method="POST")=>fetch(`${base}${url}`,{method,headers:{"Content-Type":"application/json",Cookie:cookie},body:JSON.stringify(body)});
    const lookup=async()=>fetch(`${base}/api/cooperation-contact?adcode=990101`).then(r=>r.json());
    assert.equal((await lookup()).data,null);
    const hq=await login("admin");
    for(const region of [
      {id:"sample_province",name:"测试省",level:"province",adcode:"990000"},
      {id:"sample_city",name:"测试市",level:"city",parentId:"sample_province",adcode:"990100"},
      {id:"sample_district",name:"测试区",level:"district",parentId:"sample_city",adcode:"990101"},
    ]) assert.equal((await submit("/api/admin/regions",hq,region)).status,201);
    assert.equal((await submit("/api/admin/cooperation-contact",hq,{teamName:"总部团队",phone:"01012345678"},"PUT")).status,200);
    assert.equal((await lookup()).data.sourceRegionId,"platform");
    assert.equal((await submit("/api/admin/accounts",hq,{username:"sample_province",name:"省级人员",password:"another-strong-password",level:"province",regionId:"sample_province"})).status,201);
    const province=await login("sample_province","another-strong-password");
    assert.equal((await submit("/api/admin/cooperation-contact",province,{teamName:"省级团队",phone:"03111234567"},"PUT")).status,200);
    assert.equal((await lookup()).data.sourceRegionId,"sample_province");
    assert.equal((await submit("/api/admin/accounts",province,{username:"sample_city",name:"市级人员",password:"another-strong-password",level:"city",regionId:"sample_city"})).status,201);
    const city=await login("sample_city","another-strong-password");
    assert.equal((await submit("/api/admin/cooperation-contact",city,{teamName:"市级团队",wechat:"sample_city"},"PUT")).status,200);
    assert.equal((await lookup()).data.sourceRegionId,"sample_city");
    assert.equal((await submit("/api/admin/accounts",city,{username:"sample_district",name:"区级人员",password:"another-strong-password",level:"district",regionId:"sample_district"})).status,201);
    const district=await login("sample_district","another-strong-password");
    assert.equal((await submit("/api/admin/cooperation-contact",district,{teamName:"区级团队",email:"district@example.test"},"PUT")).status,200);
    assert.equal((await lookup()).data.sourceRegionId,"sample_district");
    const viewed=await fetch(`${base}/api/admin/cooperation-contact?regionId=sample_district`,{headers:{Cookie:hq}}).then(r=>r.json());
    assert.equal(viewed.data.editable,false);
    assert.equal(viewed.data.effective.teamName,"区级团队");
    assert.equal((await fetch(`${base}/api/admin/cooperation-contact?regionId=sample_district`,{headers:{Cookie:province}})).status,200);
  } finally {await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await store.close();}
});
