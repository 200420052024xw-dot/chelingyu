import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { api, inRegion, post, type Admin, type RegionRow } from "./api";

type Region = { id:string; name:string; level:string; orders:number; vehicles:number; pricing:{ranges:Record<string,{min:number;max:number}>} };
type Point = {id:string;vehicleNo:string;location:{latitude:number;longitude:number};locationUpdatedAt?:string;area?:string;status:string};
type OverviewData = {regionId:string;pricing:{policy:{ranges:Record<string,{min:number;max:number}>;values?:Record<string,number>};valid:boolean};orders:number;activeOrders:number;vehicles:number;pendingVehicles:number;children:Region[];points:Point[]};
const titleByLevel:Record<string,string>={headquarters:"全国运营总览",province:"省级运营总览",city:"城市运营总览",district:"区级运营工作台"};
const priceLabels:Record<string,string>={baseFeeFen:"基础费",distanceFeeFenPerKm:"每公里费用",coldChainFeeFen:"冷链加收"};
const priceKeys=Object.keys(priceLabels);

export function RoleDashboard({admin,regionId,onRegionChange,openOrders,openFleet,openApplications,openPricing}:{admin:Admin;regionId:string;onRegionChange:(id:string)=>void;openOrders:()=>void;openFleet:()=>void;openApplications:()=>void;openPricing:()=>void}){
  const [data,setData]=useState<OverviewData|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{setData(null);setError("");api<OverviewData>(inRegion("/admin/overview",regionId)).then(setData).catch(e=>setError(e.message))},[regionId]);
  if(error)return <div className="alert error">{error}</div>;
  if(!data)return <div className="center-state">正在加载区域运营数据…</div>;
  const points=data.points;
  const latitudes=points.map(p=>p.location.latitude),longitudes=points.map(p=>p.location.longitude);
  const minLat=points.length?Math.min(...latitudes):0,maxLat=points.length?Math.max(...latitudes):0,minLon=points.length?Math.min(...longitudes):0,maxLon=points.length?Math.max(...longitudes):0;
  const metrics=[{label:"订单总量",value:data.orders,action:openOrders},{label:"进行中订单",value:data.activeOrders,action:openOrders},{label:"区域车辆",value:data.vehicles,action:openFleet},{label:"待审核车辆",value:data.pendingVehicles,action:openApplications}];
  return <div className="operations-dashboard">
    <div className="intro"><div><small>{admin.level.toUpperCase()} OPERATIONS</small><h2>{titleByLevel[admin.level]}</h2><p>{admin.level==="district"?"优先处理车辆入驻、订单审核与派车。":"查看辖区订单、车辆和价格授权，点击下级区域继续查看。"}</p><p>{priceKeys.map(key=>`${priceLabels[key]} ${data.pricing.policy.values?`¥${(data.pricing.policy.values[key]/100).toFixed(2)}`:`¥${(data.pricing.policy.ranges[key].min/100).toFixed(2)}–¥${(data.pricing.policy.ranges[key].max/100).toFixed(2)}`}`).join(" · ")} · {data.pricing.valid?"价格规则有效":"价格规则待调整"}</p></div>{regionId!==(admin.regionId||"")&&<button className="primary" onClick={()=>onRegionChange(admin.regionId||"")}>返回本级</button>}</div>
    <div className="metrics">{metrics.map(m=><button className="metric green" key={m.label} onClick={m.action}><span>{m.label}</span><strong>{m.value}</strong><small>查看详情 →</small></button>)}</div>
    <div className="detail-grid"><section className="panel"><div className="panel-head"><h2>区域车辆位置</h2><small>演示位置 · 非实时设备定位</small></div><div className="position-plot">{points.map((p,i)=><div key={p.id} className="position-dot" style={{left:`${10+80*(maxLon===minLon ? .5 : (p.location.longitude-minLon)/(maxLon-minLon))}%`,top:`${10+80*(maxLat===minLat ? .5 : 1-(p.location.latitude-minLat)/(maxLat-minLat))}%`}} title={`${p.vehicleNo} · ${p.area||""} · ${p.location.latitude.toFixed(4)}, ${p.location.longitude.toFixed(4)}`}>{i+1}</div>)}</div><div className="position-list">{points.length?points.map(p=><div key={p.id}><b>{p.vehicleNo}</b><span>{p.area} · {p.status} · {p.location.latitude.toFixed(4)}, {p.location.longitude.toFixed(4)}</span><small>{p.locationUpdatedAt?new Date(p.locationUpdatedAt).toLocaleString("zh-CN"):"无更新时间"}</small></div>):<p className="subtle">当前区域暂无车辆</p>}</div></section>
    <section className="panel"><div className="panel-head"><h2>{admin.level==="district"?"本区重点操作":"下级区域"}</h2></div>{data.children.length?<div className="region-list">{data.children.map(r=><button key={r.id} onClick={()=>onRegionChange(r.id)}><b>{r.name}</b><span>{r.orders} 单 · {r.vehicles} 辆</span><small>基础费 ¥{(r.pricing.ranges.baseFeeFen.min/100).toFixed(2)}–¥{(r.pricing.ranges.baseFeeFen.max/100).toFixed(2)} · 查看 →</small></button>)}</div>:<div className="quick-actions"><button onClick={openApplications}>审核入驻车辆</button><button onClick={openOrders}>处理订单与派车</button><button onClick={openPricing}>查看当前区域价格</button></div>}</section></div>
  </div>;
}

type RegionHistory={id:string;regionId:string;actorName:string;action:string;at:string};
export function RegionManagement({regions,onCreated,onSelect}:{regions:RegionRow[];onCreated:()=>void;onSelect:(id:string)=>void}){
  const [level,setLevel]=useState<RegionRow["level"]>("province"),[parentId,setParentId]=useState(""),[regionCode,setRegionCode]=useState(""),[adcode,setAdcode]=useState(""),[name,setName]=useState(""),[history,setHistory]=useState<RegionHistory[]>([]),[error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const loadHistory=()=>api<{history:RegionHistory[]}>("/admin/regions").then(value=>setHistory(value.history)).catch(e=>setError((e as Error).message));
  useEffect(()=>{void loadHistory()},[]);
  const parents=level==="province"?[]:regions.filter(r=>r.level===(level==="city"?"province":"city"));
  const create=async(event:FormEvent)=>{event.preventDefault();setBusy(true);setError("");setMessage("");try{await post("/admin/regions",{id:regionCode.trim(),name:name.trim(),level,parentId,adcode:adcode.trim()});setRegionCode("");setAdcode("");setName("");setMessage("区域档案已创建；接单范围与分润规则配置完成后才能开放接单。");onCreated();await loadHistory()}catch(reason){setError((reason as Error).message)}finally{setBusy(false)}};
  const editAdcode=async(region:RegionRow)=>{const next=window.prompt(`设置 ${region.name} 的行政区划代码（六位数字，留空可清除）`,region.adcode||"");if(next===null)return;setError("");setMessage("");try{await api(`/admin/regions/${region.id}/adcode`,{method:"PUT",body:JSON.stringify({adcode:next.trim()})});setMessage(`${region.name} 的行政区划代码已更新`);onCreated();await loadHistory()}catch(reason){setError((reason as Error).message)}};
  return <>
    <section className="panel"><div className="panel-head"><h2>创建行政区域档案</h2></div><p className="subtle">总部逐级创建省、市、区。创建档案不会直接开放接单。</p>
      <form className="account-form" onSubmit={create}>
        <label>层级<select value={level} onChange={event=>{setLevel(event.target.value as RegionRow["level"]);setParentId("")}}><option value="province">省级</option><option value="city">市级</option><option value="district">区级</option></select></label>
        {level!=="province"&&<label>上级区域<select value={parentId} onChange={event=>setParentId(event.target.value)} required><option value="">请选择</option>{parents.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>}
        <label>区域编号<input value={regionCode} onChange={event=>setRegionCode(event.target.value)} pattern="[A-Za-z0-9_]{2,32}" required placeholder="例如 hebei、tangshan、lubei"/></label>
        <label>区域名称<input value={name} onChange={event=>setName(event.target.value)} maxLength={40} required placeholder="例如 河北省、唐山市、路北区"/></label>
        <label>行政区划代码<input value={adcode} onChange={event=>setAdcode(event.target.value)} pattern="[0-9]{6}" placeholder="腾讯地图 adcode，可稍后绑定"/></label>
        <button className="primary" disabled={busy}>{busy?"创建中…":"创建区域"}</button>
      </form>{error&&<div className="alert error">{error}</div>}{message&&<div className="alert success">{message}</div>}
    </section>
    <section className="panel"><div className="panel-head"><h2>现有区域</h2><span className="count">{regions.length} 个</span></div><div className="region-list">{regions.map(r=><div key={r.id}><b>{r.name}</b><span>{r.level==="province"?"省":r.level==="city"?"市":"区"} · {r.id} · adcode {r.adcode||"未绑定"} · {r.enabled===false?"待开通接单":"已开放演示服务"}</span><button className="text-button" onClick={()=>void editAdcode(r)}>绑定代码</button><button className="text-button" onClick={()=>onSelect(r.id)}>切换查看</button></div>)}</div></section>
    {history.length>0&&<section className="panel"><div className="panel-head"><h2>区域变更记录</h2></div><div className="pricing-history">{history.map(item=><p key={item.id}>{item.actorName} · {regions.find(r=>r.id===item.regionId)?.name||item.regionId} · {item.action==="created"?"创建档案":"更新行政区划代码"} · {new Date(item.at).toLocaleString("zh-CN")}</p>)}</div></section>}
  </>;
}

type Contact={regionId:string;teamName:string;phone?:string;wechat?:string;email?:string;sourceRegionId?:string;sourceRegionName?:string};
type ContactData={regionId:string;editable:boolean;configured:Contact|null;effective:Contact|null;history:Array<{id:string;actorName:string;at:string}>};
export function CooperationContactPage({regionId}:{regionId:string}){
  const [data,setData]=useState<ContactData|null>(null),[teamName,setTeamName]=useState(""),[phone,setPhone]=useState(""),[wechat,setWechat]=useState(""),[email,setEmail]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const load=()=>api<ContactData>(inRegion("/admin/cooperation-contact",regionId)).then(value=>{setData(value);setTeamName(value.configured?.teamName||"");setPhone(value.configured?.phone||"");setWechat(value.configured?.wechat||"");setEmail(value.configured?.email||"")}).catch(reason=>setError((reason as Error).message));
  useEffect(()=>{void load()},[regionId]);
  const save=async(event:FormEvent)=>{event.preventDefault();setBusy(true);setError("");setMessage("");try{await api("/admin/cooperation-contact",{method:"PUT",body:JSON.stringify({teamName,phone,wechat,email})});setMessage("长期合作联系人已更新");await load()}catch(reason){setError((reason as Error).message)}finally{setBusy(false)}};
  if(!data)return <div className="center-state">{error||"正在加载长期合作联系人…"}</div>;
  return <>
    <section className="panel"><div className="panel-head"><h2>小程序实际展示的联系人</h2><span className="count">{data.effective?`来自 ${data.effective.sourceRegionName}`:"尚未配置"}</span></div>
      {data.effective?<div className="contact-summary"><b>{data.effective.teamName}</b>{data.effective.phone&&<p>电话：{data.effective.phone}</p>}{data.effective.wechat&&<p>微信：{data.effective.wechat}</p>}{data.effective.email&&<p>邮箱：{data.effective.email}</p>}</div>:<p className="subtle">本级和上级都没有真实联系方式，小程序隐藏“长期合作”入口。</p>}
      <p className="subtle">联系人按当前区域 → 上级市 → 省 → 总部查找；此入口与订单客服分开。</p>
    </section>
    {data.editable&&<section className="panel"><div className="panel-head"><h2>维护本级联系人</h2></div><form className="account-form" onSubmit={save}>
      <label>接洽团队<input value={teamName} onChange={event=>setTeamName(event.target.value)} maxLength={80} required placeholder="实际负责接洽的团队"/></label>
      <label>联系电话<input value={phone} onChange={event=>setPhone(event.target.value)} maxLength={40} placeholder="真实可用的电话"/></label>
      <label>微信号<input value={wechat} onChange={event=>setWechat(event.target.value)} maxLength={64} placeholder="可选"/></label>
      <label>电子邮箱<input type="email" value={email} onChange={event=>setEmail(event.target.value)} maxLength={120} placeholder="可选"/></label>
      <button className="primary" disabled={busy}>{busy?"保存中…":"保存联系方式"}</button>
    </form><p className="subtle">电话、微信和邮箱至少填写一项；不预置演示号码。</p>{error&&<div className="alert error">{error}</div>}{message&&<div className="alert success">{message}</div>}</section>}
    {data.history.length>0&&<section className="panel"><div className="panel-head"><h2>本级变更记录</h2></div><div className="pricing-history">{data.history.map(item=><p key={item.id}>{item.actorName} · {new Date(item.at).toLocaleString("zh-CN")}</p>)}</div></section>}
  </>;
}

type PricingData={policy:{regionId:string;ranges:Record<string,{min:number;max:number}>;values?:Record<string,number>;version:number};parent?:{ranges:Record<string,{min:number;max:number}>};valid:boolean;editable:boolean;children:Array<{region:{name:string};valid:boolean;policy:{ranges:Record<string,{min:number;max:number}>}}>;history:Array<{id:string;actorName:string;at:string;before:{version:number};after:{version:number}}>};
export function PricingPage({admin,regionId}:{admin:Admin;regionId:string}){
  const [data,setData]=useState<PricingData|null>(null),[draft,setDraft]=useState<PricingData["policy"]|null>(null),[error,setError]=useState(""),[message,setMessage]=useState("");
  const load=()=>api<PricingData>(inRegion("/admin/pricing",regionId)).then(x=>{setData(x);setDraft(structuredClone(x.policy))}).catch(e=>setError(e.message));
  useEffect(()=>{setData(null);setDraft(null);setError("");void load()},[regionId]);
  if(!data||!draft)return <div className="center-state">{error||"正在加载定价…"}</div>;
  const district=!!data.policy.values || (data.editable && admin.level==="district");
  const update=(key:string,side:"min"|"max"|"value",value:string)=>{const amount=Math.round(Number(value)*100);setDraft(current=>{if(!current)return current;const next=structuredClone(current);if(side==="value")next.values={...next.values,[key]:amount};else next.ranges[key]={...next.ranges[key],[side]:amount};return next})};
  const save=async()=>{if(!data.editable)return;setError("");setMessage("");try{await api("/admin/pricing",{method:"PUT",body:JSON.stringify(district?{values:draft.values}:{ranges:draft.ranges})});setMessage("价格规则已更新");await load()}catch(e){setError((e as Error).message)}};
  return <section className="panel">
    <div className="panel-head"><h2>{district?"区域执行价格":"区域授权范围"}</h2><span className="count">版本 {data.policy.version}</span></div>
    <p className="subtle">{data.editable?"当前为本账号可管理的价格规则。":"当前区域价格只读；切换查看区域不会取得定价权限。"}</p>
    {!data.valid&&<div className="alert warning">当前规则超出上级范围，新报价已暂停，请调整价格。</div>}
    {error&&<div className="alert error">{error}</div>}{message&&<div className="alert success">{message}</div>}
    <div className="pricing-grid">{priceKeys.map(key=><div className="price-item" key={key}>
      <b>{priceLabels[key]}</b><small>上级范围：{data.parent?`¥${(data.parent.ranges[key].min/100).toFixed(2)} — ¥${(data.parent.ranges[key].max/100).toFixed(2)}`:"平台制定"}</small>
      {district?<label>执行价（元）<input type="number" min="0" step="0.01" disabled={!data.editable} value={((draft.values?.[key]||0)/100).toFixed(2)} onChange={e=>update(key,"value",e.target.value)}/></label>
        :<div className="price-inputs"><label>最低（元）<input type="number" min="0" step="0.01" disabled={!data.editable} value={(draft.ranges[key].min/100).toFixed(2)} onChange={e=>update(key,"min",e.target.value)}/></label><label>最高（元）<input type="number" min="0" step="0.01" disabled={!data.editable} value={(draft.ranges[key].max/100).toFixed(2)} onChange={e=>update(key,"max",e.target.value)}/></label></div>}
    </div>)}</div>
    {data.editable&&<button className="primary" onClick={save}>保存价格规则</button>}
    {data.children.length>0&&<div className="region-list pricing-children">{data.children.map((child,i)=><div key={i}><b>{child.region.name}</b><span>{child.valid?"规则有效":"需下级调整"}</span></div>)}</div>}
    {data.history.length>0&&<div className="pricing-history"><h3>最近调整</h3>{data.history.map(entry=><p key={entry.id}>{entry.actorName} · {new Date(entry.at).toLocaleString("zh-CN")} · 版本 {entry.before.version} → {entry.after.version}</p>)}</div>}
  </section>;
}

type Application={id:string;vehicleNo:string;model:string;area:string;owner:string;imageUrl:string;status:string;reason?:string};
export function VehicleApplications({regionId}:{regionId:string}){
  const [items,setItems]=useState<Application[]>([]),[error,setError]=useState("");
  const load=()=>api<Application[]>(inRegion("/admin/vehicle-applications",regionId)).then(setItems).catch(e=>setError(e.message));
  useEffect(()=>{setItems([]);setError("");void load()},[regionId]);
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
