import assert from "node:assert/strict";
import {test} from "node:test";
import {drivingRoute,reverseAdcode} from "./maps";

const from={latitude:28.6829,longitude:115.8582};
const to={latitude:28.683,longitude:115.9002};
const reply=(body:unknown):typeof fetch=>async()=>new Response(JSON.stringify(body),{status:200});

test("Tencent driving route uses route distance in meters and duration in minutes",async()=>{
  let requested="";
  const requester:typeof fetch=async input=>{requested=String(input);return new Response(JSON.stringify({status:0,result:{routes:[{distance:8123,duration:21}]}}));};
  assert.deepEqual(await drivingRoute(from,to,"test-key",requester),{kind:"reachable",distanceMeters:8123,durationMinutes:21});
  assert.match(requested,/\/ws\/direction\/v1\/driving\//);
  assert.match(requested,/from=28\.6829%2C115\.8582/);
});

test("empty routes differ from map failures and reverse geocoder returns adcode",async()=>{
  assert.deepEqual(await drivingRoute(from,to,"test-key",reply({status:0,result:{routes:[]}})),{kind:"unreachable"});
  assert.equal((await drivingRoute(from,to,"test-key",reply({status:310,message:"rate limited"}))).kind,"unknown");
  assert.equal((await drivingRoute(from,to,"",reply({status:0,result:{routes:[]}}))).kind,"unknown");
  assert.deepEqual(await reverseAdcode(from,"test-key",reply({status:0,result:{ad_info:{adcode:"360121"}}})),{kind:"resolved",adcode:"360121"});
});
