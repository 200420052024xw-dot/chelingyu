import type { GeoPoint } from "../miniprogram/contracts/types";

export type MapRoute = { kind: "reachable"; distanceMeters: number; durationMinutes: number } | { kind: "unreachable" } | { kind: "unknown"; reason: string };
export type MapAddress = { kind: "resolved"; adcode: string } | { kind: "unknown"; reason: string };

type Requester = typeof fetch;
const pointText = (point: GeoPoint) => `${point.latitude},${point.longitude}`;
const validPoint = (point: GeoPoint) => Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude)
  && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;

async function request(path: string, params: Record<string,string>, key: string, requester: Requester): Promise<any> {
  const url = new URL(`https://apis.map.qq.com${path}`);
  for (const [name,value] of Object.entries(params)) url.searchParams.set(name,value);
  url.searchParams.set("key",key);
  const response = await requester(url,{signal:AbortSignal.timeout(5000)});
  if (!response.ok) throw new Error(`地图服务 HTTP ${response.status}`);
  return response.json();
}

/** Only an empty successful route list is a definite unavailable route. Transport and API errors remain unknown. */
export async function drivingRoute(from: GeoPoint, to: GeoPoint, key: string, requester: Requester = fetch): Promise<MapRoute> {
  if (!validPoint(from) || !validPoint(to)) return {kind:"unknown",reason:"地址坐标无效"};
  if (!key) return {kind:"unknown",reason:"地图服务未配置"};
  try {
    const body=await request("/ws/direction/v1/driving/",{from:pointText(from),to:pointText(to)},key,requester);
    if (body?.status!==0) return {kind:"unknown",reason:body?.message||"地图路线接口返回错误"};
    const routes=body?.result?.routes;
    if (!Array.isArray(routes)) return {kind:"unknown",reason:"地图路线结果无效"};
    if (routes.length===0) return {kind:"unreachable"};
    const distance=routes[0]?.distance,duration=routes[0]?.duration;
    if (!Number.isFinite(distance) || distance<0 || !Number.isFinite(duration) || duration<0) return {kind:"unknown",reason:"地图路线距离无效"};
    return {kind:"reachable",distanceMeters:Math.round(distance),durationMinutes:Math.ceil(duration)};
  } catch(error) {return {kind:"unknown",reason:error instanceof Error?error.message:"地图服务暂不可用"};}
}

export async function reverseAdcode(point: GeoPoint, key: string, requester: Requester = fetch): Promise<MapAddress> {
  if (!validPoint(point)) return {kind:"unknown",reason:"地址坐标无效"};
  if (!key) return {kind:"unknown",reason:"地图服务未配置"};
  try {
    const body=await request("/ws/geocoder/v1/",{location:pointText(point),get_poi:"0"},key,requester);
    if (body?.status!==0) return {kind:"unknown",reason:body?.message||"地图地址接口返回错误"};
    const adcode=String(body?.result?.ad_info?.adcode||"");
    return /^\d{6}$/.test(adcode)?{kind:"resolved",adcode}:{kind:"unknown",reason:"地图未返回行政区代码"};
  } catch(error) {return {kind:"unknown",reason:error instanceof Error?error.message:"地图服务暂不可用"};}
}
