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
