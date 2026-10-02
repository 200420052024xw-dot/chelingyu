export interface Admin { id:string; name:string; level:"headquarters"|"province"|"city"|"district"; regionId?:string }
export interface RegionRow { id:string; name:string; level:"province"|"city"|"district"; parentId?:string; adcode?:string; enabled?:boolean }
export interface OrderRow { id:string; orderNo:string; status:string; createdAt:string; scheduledPickupAt?:string; sender:{name:string;contactName:string;contactMobile:string;detail:string}; receiver:{name:string;contactName:string;contactMobile:string;detail:string}; vehicleModelName:string; vehicleNo?:string; totalAmountFen:number; pickupRegion?:string; destinationRegion?:string; serviceRegionId:string; canOperate?:boolean }
export interface Page<T> { items:T[];total:number;page:number;pageSize:number;totalPages:number }
export interface Detail { order:OrderRow&{version?:number;cargo:{description:string;quantity:number;unitWeightGrams?:number;unitDimensionsMm?:{length:number;width:number;height:number};fragile:boolean};priceItems:Array<{label:string;amountFen:number}>; dispatchSource:string; proposedVehicleModelId?:string; proposedTotalAmountFen?:number; proposedRouteDistanceMeters?:number; routeDistanceMeters?:number;routeDistanceSource?:string;routeReviewRequired?:boolean;routeReviewEvidence?:string; dispatchReviewReason?:string; cancellationReason?:string}; events:Array<{id:string;fromStatus?:string;toStatus:string;note?:string;occurredAt:string}>; payment?:{status:string;amountFen:number};refund?:{status:string;amountFen:number}; audit:Array<{id:string;actorName:string;action:string;note:string;at:string}>;canOperate:boolean;candidateVehicles:Array<{id:string;vehicleNo:string;batteryPercent:number;area:string;owner:string}>;assignedVehiclePublic?:{vehicleNo:string;batteryPercent:number;location:{latitude:number;longitude:number}} }
export interface Notice { id:string;orderId:string;title:string;at:string;read:boolean }
export interface VehicleRow { id:string;vehicleNo:string;modelId:string;area:string;owner:string;status:string;batteryPercent:number;ownerShared:boolean;activeReservations:number;availability?:{enabled:boolean;ranges:Array<{weekdays:number[];startTime:string;endTime:string}>} }
export const money=(fen:number|undefined)=>fen===undefined?"—":`¥${(fen/100).toFixed(2)}`;
export const dateTime=(value?:string)=>value?new Date(value).toLocaleString("zh-CN",{hour12:false}):"—";
export const inRegion=(url:string,regionId:string)=>`${url}${url.includes("?")?"&":"?"}regionId=${encodeURIComponent(regionId)}`;
export async function api<T>(url:string,options:RequestInit={}):Promise<T>{
  const res=await fetch(`/api${url}`,{...options,credentials:"include",headers:{"Content-Type":"application/json",...options.headers}});
  const body=await res.json().catch(()=>({msg:"响应格式错误"}));
  if(!res.ok)throw new Error(body.msg||"请求失败");
  return body.data as T;
}
export const post=<T,>(url:string,data:unknown)=>api<T>(url,{method:"POST",body:JSON.stringify(data)});
