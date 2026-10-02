import { useEffect, useState, type ChangeEvent } from "react";
import { api, type Admin } from "./api";

type Region = { id:string; name:string; level:string; orders:number; vehicles:number; pricing:{ranges:Record<string,{min:number;max:number}>} };
type Point = {id:string;vehicleNo:string;location:{latitude:number;longitude:number};locationUpdatedAt?:string;area?:string;status:string};
type OverviewData = {regionId:string;pricing:{policy:{ranges:Record<string,{min:number;max:number}>;values?:Record<string,number>};valid:boolean};orders:number;activeOrders:number;vehicles:number;pendingVehicles:number;children:Region[];points:Point[]};
const titleByLevel:Record<string,string>={headquarters:"全国运营总览",province:"省级运营总览",city:"城市运营总览",district:"区级运营工作台"};
const priceLabels:Record<string,string>={baseFeeFen:"基础费",distanceFeeFenPerKm:"每公里费用",coldChainFeeFen:"冷链加收"};
const priceKeys=Object.keys(priceLabels);

export function RoleDashboard({admin,openOrders,openFleet,openApplications,openPricing}:{admin:Admin;openOrders:()=>void;openFleet:()=>void;openApplications:()=>void;openPricing:()=>void}){
  const [regionId,setRegionId]=useState(admin.regionId||"");
  const [data,setData]=useState<OverviewData|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{setData(null);api<OverviewData>(`/admin/overview?regionId=${encodeURIComponent(regionId)}`).then(setData).catch(e=>setError(e.message))},[regionId]);
  if(error)return <div className="alert error">{error}</div>;
  if(!data)return <div className="center-state">正在加载区域运营数据…</div>;
  const points=data.points;
  const latitudes=points.map(p=>p.location.latitude),longitudes=points.map(p=>p.location.longitude);
  const minLat=points.length?Math.min(...latitudes):0,maxLat=points.length?Math.max(...latitudes):0,minLon=points.length?Math.min(...longitudes):0,maxLon=points.length?Math.max(...longitudes):0;
  const metrics=[{label:"订单总量",value:data.orders,action:openOrders},{label:"进行中订单",value:data.activeOrders,action:openOrders},{label:"区域车辆",value:data.vehicles,action:openFleet},{label:"待审核车辆",value:data.pendingVehicles,action:openApplications}];
  return <div className="operations-dashboard">
    <div className="intro"><div><small>{admin.level.toUpperCase()} OPERATIONS</small><h2>{titleByLevel[admin.level]}</h2><p>{admin.level==="district"?"优先处理车辆入驻、订单审核与派车。":"查看辖区订单、车辆和价格授权，点击下级区域继续查看。"}</p><p>{priceKeys.map(key=>`${priceLabels[key]} ${data.pricing.policy.values?`¥${(data.pricing.policy.values[key]/100).toFixed(2)}`:`¥${(data.pricing.policy.ranges[key].min/100).toFixed(2)}–¥${(data.pricing.policy.ranges[key].max/100).toFixed(2)}`}`).join(" · ")} · {data.pricing.valid?"价格规则有效":"价格规则待调整"}</p></div>{regionId!==admin.regionId&&<button className="primary" onClick={()=>setRegionId(admin.regionId||"")}>返回本级</button>}</div>
    <div className="metrics">{metrics.map(m=><button className="metric green" key={m.label} onClick={m.action}><span>{m.label}</span><strong>{m.value}</strong><small>查看详情 →</small></button>)}</div>
    <div className="detail-grid"><section className="panel"><div className="panel-head"><h2>区域车辆位置</h2><small>演示位置 · 非实时设备定位</small></div><div className="position-plot">{points.map((p,i)=><div key={p.id} className="position-dot" style={{left:`${10+80*(maxLon===minLon ? .5 : (p.location.longitude-minLon)/(maxLon-minLon))}%`,top:`${10+80*(maxLat===minLat ? .5 : 1-(p.location.latitude-minLat)/(maxLat-minLat))}%`}} title={`${p.vehicleNo} · ${p.area||""} · ${p.location.latitude.toFixed(4)}, ${p.location.longitude.toFixed(4)}`}>{i+1}</div>)}</div><div className="position-list">{points.length?points.map(p=><div key={p.id}><b>{p.vehicleNo}</b><span>{p.area} · {p.status} · {p.location.latitude.toFixed(4)}, {p.location.longitude.toFixed(4)}</span><small>{p.locationUpdatedAt?new Date(p.locationUpdatedAt).toLocaleString("zh-CN"):"无更新时间"}</small></div>):<p className="subtle">当前区域暂无车辆</p>}</div></section>
    <section className="panel"><div className="panel-head"><h2>{admin.level==="district"?"本区重点操作":"下级区域"}</h2></div>{data.children.length?<div className="region-list">{data.children.map(r=><button key={r.id} onClick={()=>setRegionId(r.id)}><b>{r.name}</b><span>{r.orders} 单 · {r.vehicles} 辆</span><small>基础费 ¥{(r.pricing.ranges.baseFeeFen.min/100).toFixed(2)}–¥{(r.pricing.ranges.baseFeeFen.max/100).toFixed(2)} · 查看 →</small></button>)}</div>:<div className="quick-actions"><button onClick={openApplications}>审核入驻车辆</button><button onClick={openOrders}>处理订单与派车</button><button onClick={openPricing}>设置本区执行价</button></div>}</section></div>
  </div>;
}

type PricingData={policy:{regionId:string;ranges:Record<string,{min:number;max:number}>;values?:Record<string,number>;version:number};parent?:{ranges:Record<string,{min:number;max:number}>};valid:boolean;children:Array<{region:{name:string};valid:boolean;policy:{ranges:Record<string,{min:number;max:number}>}}>;history:Array<{id:string;actorName:string;at:string;before:{version:number};after:{version:number}}>};
export function PricingPage({admin}:{admin:Admin}){
  const [data,setData]=useState<PricingData|null>(null),[draft,setDraft]=useState<PricingData["policy"]|null>(null),[error,setError]=useState(""),[message,setMessage]=useState("");
  const load=()=>api<PricingData>("/admin/pricing").then(x=>{setData(x);setDraft(structuredClone(x.policy))}).catch(e=>setError(e.message));
  useEffect(()=>{void load()},[]);
  if(!data||!draft)return <div className="center-state">{error||"正在加载定价…"}</div>;
  const district=admin.level==="district";
  const update=(key:string,side:"min"|"max"|"value",value:string)=>{const amount=Math.round(Number(value)*100);setDraft(current=>{if(!current)return current;const next=structuredClone(current);if(side==="value")next.values={...next.values,[key]:amount};else next.ranges[key]={...next.ranges[key],[side]:amount};return next})};
  const save=async()=>{setError("");setMessage("");try{await api("/admin/pricing",{method:"PUT",body:JSON.stringify(district?{values:draft.values}:{ranges:draft.ranges})});setMessage("价格规则已更新");await load()}catch(e){setError((e as Error).message)}};
  return <section className="panel"><div className="panel-head"><h2>{district?"本区执行价格":"本级授权范围"}</h2><span className="count">版本 {data.policy.version}</span></div><p className="subtle">{district?"执行价必须处于市级授权范围内。":"下级只能在本级范围内继续收窄。"}</p>{!data.valid&&<div className="alert warning">当前规则超出上级范围，新报价已暂停，请调整价格。</div>}{error&&<div className="alert error">{error}</div>}{message&&<div className="alert success">{message}</div>}<div className="pricing-grid">{priceKeys.map(key=><div className="price-item" key={key}><b>{priceLabels[key]}</b><small>上级范围：{data.parent?`¥${(data.parent.ranges[key].min/100).toFixed(2)} — ¥${(data.parent.ranges[key].max/100).toFixed(2)}`:"平台制定"}</small>{district?<label>执行价（元）<input type="number" min="0" step="0.01" value={((draft.values?.[key]||0)/100).toFixed(2)} onChange={e=>update(key,"value",e.target.value)}/></label>:<div className="price-inputs"><label>最低（元）<input type="number" min="0" step="0.01" value={(draft.ranges[key].min/100).toFixed(2)} onChange={e=>update(key,"min",e.target.value)}/></label><label>最高（元）<input type="number" min="0" step="0.01" value={(draft.ranges[key].max/100).toFixed(2)} onChange={e=>update(key,"max",e.target.value)}/></label></div>}</div>)}</div><button className="primary" onClick={save}>保存价格规则</button>{data.children.length>0&&<div className="region-list pricing-children">{data.children.map((child,i)=><div key={i}><b>{child.region.name}</b><span>{child.valid?"规则有效":"需下级调整"}</span></div>)}</div>}{data.history.length>0&&<div className="pricing-history"><h3>最近调整</h3>{data.history.map(entry=><p key={entry.id}>{entry.actorName} · {new Date(entry.at).toLocaleString("zh-CN")} · 版本 {entry.before.version} → {entry.after.version}</p>)}</div>}</section>;
}

type Application={id:string;vehicleNo:string;model:string;area:string;owner:string;imageUrl:string;status:string;reason?:string};
export function VehicleApplications(){
  const [items,setItems]=useState<Application[]>([]),[error,setError]=useState("");
  const load=()=>api<Application[]>("/admin/vehicle-applications").then(setItems).catch(e=>setError(e.message));
  useEffect(()=>{void load()},[]);
  const review=async(item:Application,decision:"approved"|"rejected")=>{const reason=window.prompt(decision==="rejected"?"请输入驳回原因":"填写处理说明；上级介入时必填","");if(reason===null)return;setError("");try{await api(`/admin/vehicle-applications/${item.id}/review`,{method:"POST",body:JSON.stringify({decision,reason})});await load()}catch(e){setError((e as Error).message)}};
  return <section className="panel"><div className="panel-head"><h2>车辆入驻审核</h2><span className="count">待审核 {items.filter(x=>x.status==="pending").length}</span></div>{error&&<div className="alert error">{error}</div>}<div className="application-grid">{items.map(item=><article className="application-card" key={item.id}><img src={item.imageUrl} alt={`${item.vehicleNo}车辆照片`}/><div><b>{item.vehicleNo}</b><p>{item.model} · {item.area}</p><small>车主：{item.owner} · {item.status==="pending"?"待审核":item.status==="approved"?"已通过":"已驳回"}</small>{item.reason&&<p>{item.reason}</p>}{item.status==="pending"&&<div className="application-actions"><button className="primary" onClick={()=>review(item,"approved")}>审核通过</button><button className="danger-outline" onClick={()=>review(item,"rejected")}>驳回</button></div>}</div></article>)}</div>{!items.length&&<div className="empty">暂无车辆申请</div>}</section>;
}

type Model={id:string;name:string;code:string;imageUrl:string};
export function ModelImages(){
  const [models,setModels]=useState<Model[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState("");
  const load=()=>api<Model[]>("/admin/models").then(setModels).catch(e=>setError(e.message));
  useEffect(()=>{void load()},[]);
  const upload=async(model:Model,event:ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];if(!file)return;setError("");setBusy(model.id);try{if(file.size>5*1024*1024)throw new Error("图片不能超过 5MB");await api(`/admin/models/${model.id}/image`,{method:"PUT",headers:{"Content-Type":file.type},body:file});await load()}catch(e){setError((e as Error).message)}finally{setBusy("");event.target.value=""}};
  return <section className="panel"><div className="panel-head"><h2>小程序车型照片</h2></div><p className="subtle">支持 PNG、JPEG、WebP，单张不超过 5MB。更新后共享模式小程序读取新照片。</p>{error&&<div className="alert error">{error}</div>}<div className="model-grid">{models.map(model=><article key={model.id}><img src={model.imageUrl} alt={model.name}/><b>{model.name}</b><small>{model.code}</small><label className="upload-button">{busy===model.id?"上传中…":"更换照片"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!busy} onChange={e=>upload(model,e)}/></label></article>)}</div></section>;
}
