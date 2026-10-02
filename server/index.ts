import { createHmac, timingSafeEqual } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DeliveryOrder, OrderDraft, Quote } from "../miniprogram/contracts/types";
import { acceptQuote, cancel, createOrder, customerConfirm, dispatch, eligibleVehicles, markException, orderDetail, payMock, progress, review } from "./orders";
import { ApiError, canOperateOrder, canSeeOrder, fail, getOrder, hashPassword, id, now, seedState, StateStore, verifyPassword, visibleRegions, type AdminAccount, type SharedState } from "./state";
import { pricingStatus, quoteFor, savePricing } from "./pricing";
import { saveImage, uploadDirectory } from "./uploads";
import { computeInputFingerprint } from "../miniprogram/domain/pricing";
import type { PriceKey, PriceRange } from "./state";

interface Config { secret: string; appId?: string; appSecret?: string; demoAuth: boolean; production: boolean; }
type Principal = { kind: "customer"; id: string } | { kind: "admin"; id: string };
const envelope = (data: unknown) => ({ code: "OK", msg: "", data });
const asyncRoute = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req,res)).catch(next); };
function sign(data: string, secret: string) { return createHmac("sha256", secret).update(data).digest("base64url"); }
function token(principal: Principal, secret: string) {
  const payload = Buffer.from(JSON.stringify({ ...principal, expires: Date.now() + 7 * 86400_000 })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}
function parseToken(value: string | undefined, secret: string): Principal | undefined {
  if (!value) return;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return;
  const expected = sign(payload, secret);
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return;
  try { const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()); return parsed.expires > Date.now() && (parsed.kind === "admin" || parsed.kind === "customer") ? { kind: parsed.kind, id: parsed.id } : undefined; } catch { return; }
}
function cookie(req: Request, name: string) { return req.headers.cookie?.split(";").map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1); }
function principal(req: Request, config: Config) {
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  return parseToken(bearer || cookie(req, "cly_admin"), config.secret) || fail(401, "UNAUTHORIZED", "请先登录");
}
function customer(req: Request, config: Config) { const p = principal(req, config); return p.kind === "customer" ? p.id : fail(403, "FORBIDDEN", "仅客户可以执行此操作"); }
async function admin(req: Request, config: Config, store: StateStore) {
  const p = principal(req, config);
  if (p.kind !== "admin") fail(403, "FORBIDDEN", "需要管理员身份");
  return store.read(s => s.admins.find(a => a.id === p.id) || fail(401, "UNAUTHORIZED", "管理员账号不存在"));
}
function guardVersion(order: DeliveryOrder, expected: unknown) {
  if (expected !== undefined && Number(expected) !== (order.version || 1)) fail(409, "CONFLICT", "订单已更新，请刷新后重试");
  order.version = (order.version || 1) + 1;
}
function orderSummary(order: DeliveryOrder) {
  return { id: order.id, orderNo: order.orderNo, status: order.status, createdAt: order.createdAt, scheduledPickupAt: order.scheduledPickupAt, sender: order.sender, receiver: order.receiver, vehicleModelName: order.vehicleSnapshot.modelName, vehicleNo: order.vehicleSnapshot.vehicleNo, dispatchSource: order.dispatchSource, totalAmountFen: order.totalAmountFen, serviceRegionId: order.serviceRegionId };
}
export function createApp(store: StateStore, config: Config) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "7mb" }));
  app.use("/uploads", express.static(uploadDirectory, { immutable: true, maxAge: "1y" }));
  app.use("/assets", express.static(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../miniprogram/assets")));
  app.get("/api/health", (_req,res) => res.json(envelope({ ok: true, at: now() })));

  app.post("/api/auth/wechat", asyncRoute(async (req,res) => {
    const code = String(req.body?.code || "");
    if (!code || !config.appId || !config.appSecret) fail(400, "LOGIN_UNAVAILABLE", "微信登录尚未配置");
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(config.appId!)}&secret=${encodeURIComponent(config.appSecret!)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
    const response = await fetch(url);
    const data = await response.json() as { openid?: string; errcode?: number };
    if (!response.ok || !data.openid) fail(401, "LOGIN_FAILED", `微信登录失败${data.errcode ? ` (${data.errcode})` : ""}`);
    const user = await store.change(s => {
      let value = s.users.find(u => u.openId === data.openid);
      if (!value) { value = { id: id("user"), openId: data.openid!, nickname: "微信用户" }; s.users.push(value); }
      return value;
    });
    res.json(envelope({ token: token({ kind: "customer", id: user.id }, config.secret), user }));
  }));
  if (config.demoAuth && !config.production) app.post("/api/auth/demo", asyncRoute(async (req,res) => {
    const demoId = req.body?.demoId === "demo-donghu" ? "demo-donghu" : "demo-user";
    await store.change(s => { if (!s.users.some(u => u.id === demoId)) s.users.push({ id: demoId, openId: `demo:${demoId}`, nickname: demoId === "demo-user" ? "演示用户" : "东湖演示用户" }); });
    res.json(envelope({ token: token({ kind: "customer", id: demoId }, config.secret), user: { id: demoId } }));
  }));

  app.post("/api/admin/auth/login", asyncRoute(async (req,res) => {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    const account = await store.read(s => s.admins.find(a => a.username === username));
    if (!account || !verifyPassword(password, account.passwordHash)) fail(401, "LOGIN_FAILED", "用户名或密码错误");
    res.cookie("cly_admin", token({ kind: "admin", id: account!.id }, config.secret), { httpOnly: true, sameSite: "lax", secure: config.production, maxAge: 7 * 86400_000 });
    res.json(envelope({ id: account!.id, name: account!.name, level: account!.level, regionId: account!.regionId }));
  }));
  app.post("/api/admin/auth/logout", (_req,res) => { res.clearCookie("cly_admin"); res.json(envelope(true)); });
  app.get("/api/admin/auth/me", asyncRoute(async (req,res) => { const a = await admin(req, config, store); res.json(envelope({ id:a.id, name:a.name, level:a.level, regionId:a.regionId })); }));
  app.get("/api/admin/accounts", asyncRoute(async (req,res) => {
    const a=await admin(req,config,store);
    if(a.level==="district") fail(403,"FORBIDDEN","区级不能管理运营账号");
    res.json(envelope(await store.read(s=>s.admins.filter(item=>item.level===({headquarters:"province",province:"city",city:"district"} as Record<string,string>)[a.level] && (a.level==="headquarters" || s.regions.find(r=>r.id===item.regionId)?.parentId===a.regionId)).map(({passwordHash,...account})=>account))));
  }));
  app.post("/api/admin/accounts", asyncRoute(async (req,res) => {
    const a=await admin(req,config,store);
    if(a.level==="district") fail(403,"FORBIDDEN","区级不能创建运营账号");
    const username=String(req.body?.username||"").trim(),name=String(req.body?.name||"").trim(),password=String(req.body?.password||""),level=String(req.body?.level||""),regionId=String(req.body?.regionId||"");
    if(!/^[a-zA-Z0-9_]{3,32}$/.test(username)||!name||password.length<12||level!==({headquarters:"province",province:"city",city:"district"} as Record<string,string>)[a.level]) fail(400,"VALIDATION_ERROR","账号级别不符或资料不完整，密码至少12位");
    const value=await store.change(s=>{
      if(s.admins.some(item=>item.username===username)) fail(409,"CONFLICT","账号已存在");
      if(level!=="headquarters"&&!s.regions.some(r=>r.id===regionId&&r.level===level)) fail(400,"VALIDATION_ERROR","账号区域与级别不匹配");
      if(a.level!=="headquarters"&&s.regions.find(r=>r.id===regionId)?.parentId!==a.regionId) fail(403,"FORBIDDEN","只能创建直属下级区域账号");
      const account:AdminAccount={id:id("admin"),username,name,passwordHash:hashPassword(password),level:level as AdminAccount["level"],regionId:level==="headquarters"?undefined:regionId};
      s.admins.push(account);
      const {passwordHash,...publicAccount}=account;return publicAccount;
    });res.status(201).json(envelope(value));
  }));
  app.put("/api/admin/accounts/:id/password", asyncRoute(async (req,res) => {
    const a=await admin(req,config,store);
    if(a.level==="district") fail(403,"FORBIDDEN","区级不能重置运营账号密码");
    const password=String(req.body?.password||"");
    if(password.length<12) fail(400,"VALIDATION_ERROR","密码至少12位");
    await store.change(s=>{const account=s.admins.find(item=>item.id===req.params.id)||fail(404,"NOT_FOUND","账号不存在");if(account.level!==({headquarters:"province",province:"city",city:"district"} as Record<string,string>)[a.level]||(a.level!=="headquarters"&&s.regions.find(r=>r.id===account.regionId)?.parentId!==a.regionId)) fail(403,"FORBIDDEN","只能管理直属下级账号");account.passwordHash=hashPassword(password);});
    res.json(envelope(true));
  }));

  app.get("/api/regions", asyncRoute(async (_req,res) => { res.json(envelope(await store.read(s => ({ regions:s.regions, areas:s.areas })))); }));
  app.get("/api/admin/regions", asyncRoute(async (req,res) => { const a=await admin(req,config,store);res.json(envelope(await store.read(s=>{const scope=visibleRegions(s,a);return {regions:s.regions.filter(r=>scope.has(r.id)),areas:s.areas.filter(x=>scope.has(x.regionId))};}))); }));
  app.get("/api/models", asyncRoute(async (_req,res) => { res.json(envelope(await store.read(s => s.models.filter(m=>m.enabled)))); }));
  app.get("/api/admin/overview", asyncRoute(async (req,res) => {
    const a=await admin(req,config,store);
    const value=await store.read(s=>{
      const scope=visibleRegions(s,a);
      const requested=String(req.query.regionId||a.regionId||"");
      if(requested && !scope.has(requested)) fail(403,"FORBIDDEN","无权查看该区域");
      const included=requested ? new Set([requested,...s.regions.filter(r=>{let current=r;while(current.parentId){if(current.parentId===requested)return true;current=s.regions.find(x=>x.id===current.parentId)!;if(!current)break;}return false}).map(r=>r.id)]) : scope;
      const areas=s.areas.filter(x=>included.has(x.regionId));
      const areaIds=new Set(areas.map(x=>x.id));
      const orders=s.orders.filter(o=>areaIds.has(o.serviceRegionId));
      const vehicles=s.vehicles.filter(v=>areaIds.has(v.serviceRegionId));
      const pendingVehicles=s.vehicleApplications.filter(v=>v.status==="pending"&&areaIds.has(v.areaId));
      const children=s.regions.filter(r=>r.parentId===(requested||undefined)&&included.has(r.id)).map(r=>{
        const childScope=visibleRegions(s,{...a,level:r.level,regionId:r.id});
        const childAreas=new Set(s.areas.filter(x=>childScope.has(x.regionId)).map(x=>x.id));
        return { ...r, orders:s.orders.filter(o=>childAreas.has(o.serviceRegionId)).length, vehicles:s.vehicles.filter(v=>childAreas.has(v.serviceRegionId)).length, pricing:pricingStatus(s,r.id).policy };
      });
      return { regionId:requested||"platform", pricing:pricingStatus(s,requested||"platform"), orders:orders.length, activeOrders:orders.filter(o=>!["completed","cancelled","failed"].includes(o.status)).length, vehicles:vehicles.length, pendingVehicles:pendingVehicles.length, children, points:vehicles.filter(v=>v.location).map(v=>({id:v.id,vehicleNo:v.vehicleNo,location:v.location,locationUpdatedAt:v.locationUpdatedAt,area:s.areas.find(x=>x.id===v.serviceRegionId)?.name,status:v.status})) };
    });res.json(envelope(value));
  }));
  app.get("/api/admin/pricing", asyncRoute(async (req,res) => {
    const a=await admin(req,config,store);
    res.json(envelope(await store.read(s=>{
      const regionId=a.level==="headquarters"?"platform":a.regionId!;
      const own=pricingStatus(s,regionId);
      const children=s.regions.filter(r=>r.parentId===(regionId==="platform"?undefined:regionId)).map(r=>({ ...pricingStatus(s,r.id), region:s.regions.find(x=>x.id===r.id) }));
      return { ...own, children, history:s.pricingHistory.filter(x=>x.regionId===regionId).slice(-10).reverse() };
    })));
  }));
  app.put("/api/admin/pricing", asyncRoute(async (req,res) => {
    const a=await admin(req,config,store);
    const value=await store.change(s=>savePricing(s,a,{ranges:req.body?.ranges as Record<PriceKey,PriceRange>|undefined,values:req.body?.values as Record<PriceKey,number>|undefined}));
    res.json(envelope(value));
  }));
  app.get("/api/fleet", asyncRoute(async (req,res) => {
    const userId = customer(req,config); void userId;
    const areaId = String(req.query.areaId || "");
    res.json(envelope(await store.read(s => s.vehicles.filter(v => v.enabled && v.ownerShared && v.status === "available" && s.availability.some(r => r.vehicleId === v.id && r.enabled) && (!areaId || v.serviceRegionId === areaId)).map(v => ({ ...v, ownerId: undefined, model: s.models.find(m => m.id === v.modelId) })) )));
  }));
  app.post("/api/quotes", asyncRoute(async (req,res) => {
    const userId=customer(req,config);
    const draft=req.body?.draft as OrderDraft;
    const modelId=String(req.body?.modelId||"");
    if(!draft?.sender||!draft.receiver||!draft.cargo||!modelId) fail(400,"VALIDATION_ERROR","报价资料不完整");
    const value=await store.read(s=>{
      const model=s.models.find(m=>m.id===modelId&&m.enabled)||fail(404,"NOT_FOUND","车型不存在");
      const price=quoteFor(s,draft.sender!,draft.receiver!,draft.cargo!,model);
      const timestamp=now();
      return {id:id("quote"),orderDraftId:draft.id,draftRevision:draft.revision,inputFingerprint:computeInputFingerprint(draft,modelId),customerId:userId,vehicleModelId:modelId,pricingPolicyId:price.policyId,pricingPolicyVersion:price.policyVersion,routeDistanceMeters:0,estimatedArrivalMinutes:0,items:price.items,totalAmountFen:price.total,expiresAt:new Date(Date.now()+5*60_000).toISOString(),createdAt:timestamp,updatedAt:timestamp} as Quote;
    });res.json(envelope(value));
  }));
  app.post("/api/orders", asyncRoute(async (req,res) => {
    const userId = customer(req,config);
    const value = await store.change(s => createOrder(s,userId,{ draft:req.body?.draft as OrderDraft, quote:req.body?.quote as Quote, requestId:String(req.body?.requestId || "") }));
    res.status(201).json(envelope(value));
  }));
  app.get("/api/orders", asyncRoute(async (req,res) => {
    const userId = customer(req,config);
    const status = String(req.query.status || "all");
    const list = await store.read(s => s.orders.filter(o => o.customerId === userId && (status === "all" || (status === "active" ? !["completed","cancelled","failed"].includes(o.status) : status === "payment" ? ["pending_payment","pending_customer_quote"].includes(o.status) : status === "in_progress" ? !["pending_payment","pending_customer_quote","completed","cancelled","failed"].includes(o.status) : o.status === status))).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(orderSummary));
    res.json(envelope(list));
  }));
  app.get("/api/orders/:id", asyncRoute(async (req,res) => {
    const userId = customer(req,config);
    const value = await store.read(s => { const order = getOrder(s,String(req.params.id)); if (order.customerId !== userId) fail(403,"FORBIDDEN","无权查看此订单"); return orderDetail(s,order); });
    res.json(envelope(value));
  }));
  app.post("/api/orders/:id/accept-quote", asyncRoute(async (req,res) => { const userId=customer(req,config); const value=await store.change(s=>{ const o=getOrder(s,String(req.params.id)); guardVersion(o,req.body?.expectedVersion); return acceptQuote(s,userId,o.id); }); res.json(envelope(value)); }));
  app.post("/api/orders/:id/pay-mock", asyncRoute(async (req,res) => { const userId=customer(req,config); const value=await store.change(s=>{ const o=getOrder(s,String(req.params.id)); guardVersion(o,req.body?.expectedVersion); return payMock(s,userId,o.id,String(req.body?.requestId||""),req.body?.scenario==="fail"?"fail":"success"); }); res.json(envelope(value)); }));
  app.post("/api/orders/:id/cancel", asyncRoute(async (req,res) => { const userId=customer(req,config); const value=await store.change(s=>{ const o=getOrder(s,String(req.params.id)); guardVersion(o,req.body?.expectedVersion); return cancel(s,userId,o.id,String(req.body?.reason||"")); }); res.json(envelope(value)); }));
  app.post("/api/orders/:id/confirm-loaded", asyncRoute(async (req,res) => { const userId=customer(req,config); const value=await store.change(s=>{ const o=getOrder(s,String(req.params.id)); guardVersion(o,req.body?.expectedVersion); return customerConfirm(s,userId,o.id,"loaded"); }); res.json(envelope(value)); }));
  app.post("/api/orders/:id/confirm-received", asyncRoute(async (req,res) => { const userId=customer(req,config); const value=await store.change(s=>{ const o=getOrder(s,String(req.params.id)); guardVersion(o,req.body?.expectedVersion); return customerConfirm(s,userId,o.id,"received"); }); res.json(envelope(value)); }));

  app.get("/api/owner/vehicles", asyncRoute(async (req,res) => {
    const userId=customer(req,config);
    const value=await store.read(s=>{ const owners=s.owners.filter(o=>o.userId===userId).map(o=>o.id); return s.vehicles.filter(v=>owners.includes(v.ownerId)).map(v=>({ vehicle:v, rule:s.availability.find(r=>r.vehicleId===v.id), model:s.models.find(m=>m.id===v.modelId) })); });
    res.json(envelope(value));
  }));
  app.get("/api/owner/vehicle-applications", asyncRoute(async (req,res) => {
    const userId=customer(req,config);
    res.json(envelope(await store.read(s=>{const owners=new Set(s.owners.filter(o=>o.userId===userId).map(o=>o.id));return s.vehicleApplications.filter(x=>owners.has(x.ownerId));})));
  }));
  app.post("/api/owner/vehicle-applications", asyncRoute(async (req,res) => {
    const userId=customer(req,config);
    const vehicleNo=String(req.body?.vehicleNo||"").trim().toUpperCase();
    const modelId=String(req.body?.modelId||"");
    const areaId=String(req.body?.areaId||"");
    const imageBase64=String(req.body?.imageBase64||"");
    if(!/^[A-Z0-9-]{3,32}$/.test(vehicleNo)||!imageBase64||imageBase64.length>7_000_000) fail(400,"VALIDATION_ERROR","车辆编号或照片无效");
    await store.read(s=>{if(!s.models.some(m=>m.id===modelId&&m.enabled)||!s.areas.some(a=>a.id===areaId)) fail(400,"VALIDATION_ERROR","车型或运营区域无效");if(s.vehicles.some(v=>v.vehicleNo===vehicleNo)||s.vehicleApplications.some(v=>v.vehicleNo===vehicleNo&&v.status!=="rejected")) fail(409,"CONFLICT","车辆编号已存在");});
    const imageUrl=await saveImage(Buffer.from(imageBase64,"base64"));
    const value=await store.change(s=>{
      if(!s.models.some(m=>m.id===modelId&&m.enabled)||!s.areas.some(a=>a.id===areaId)) fail(400,"VALIDATION_ERROR","车型或运营区域无效");
      if(s.vehicles.some(v=>v.vehicleNo===vehicleNo)||s.vehicleApplications.some(v=>v.vehicleNo===vehicleNo&&v.status!=="rejected")) fail(409,"CONFLICT","车辆编号已存在");
      let owner=s.owners.find(o=>o.userId===userId);
      if(!owner){owner={id:id("owner"),userId,name:"车主"};s.owners.push(owner);}
      const timestamp=now();
      const application={id:id("vehicle_application"),ownerId:owner.id,vehicleNo,modelId,areaId,imageUrl,status:"pending" as const,createdAt:timestamp,updatedAt:timestamp};
      s.vehicleApplications.push(application);return application;
    });res.status(201).json(envelope(value));
  }));
  app.get("/api/owner/vehicles/available-demo", asyncRoute(async (req,res) => { customer(req,config); res.json(envelope(await store.read(s=>s.vehicles.filter(v=>v.ownerId==="owner_demo_unbound").map(v=>({ ...v,model:s.models.find(m=>m.id===v.modelId) }))))); }));
  app.post("/api/owner/vehicles/:id/bind-demo", asyncRoute(async (req,res) => {
    const userId=customer(req,config);
    const value=await store.change(s=>{
      const vehicle=s.vehicles.find(v=>v.id===req.params.id)||fail(404,"NOT_FOUND","车辆不存在");
      if(vehicle.ownerId!=="owner_demo_unbound") fail(409,"CONFLICT","该演示车辆已被绑定");
      let owner=s.owners.find(o=>o.userId===userId);
      if(!owner){owner={id:id("owner"),userId,name:"演示车主"};s.owners.push(owner);}
      vehicle.ownerId=owner.id;vehicle.updatedAt=now();return vehicle;
    });res.json(envelope(value));
  }));
  app.get("/api/owner/vehicles/:id", asyncRoute(async (req,res) => {
    const userId=customer(req,config);
    const value=await store.read(s=>{
      const vehicle=s.vehicles.find(v=>v.id===req.params.id)||fail(404,"NOT_FOUND","车辆不存在");
      if(!s.owners.some(o=>o.id===vehicle.ownerId&&o.userId===userId)) fail(403,"FORBIDDEN","无权查看该车辆");
      const tasks=s.orders.filter(o=>o.assignedVehicleId===vehicle.id).map(o=>({ orderId:o.id,orderNo:o.orderNo,status:o.status,pickup:{...o.sender,contactName:o.sender.contactName.slice(0,1)+"**",contactMobile:o.sender.contactMobile.replace(/(\d{3})\d{4}(\d{4})/,"$1****$2")},dropoff:{...o.receiver,contactName:o.receiver.contactName.slice(0,1)+"**",contactMobile:o.receiver.contactMobile.replace(/(\d{3})\d{4}(\d{4})/,"$1****$2")},vehicleNo:vehicle.vehicleNo,scheduledAt:o.scheduledPickupAt,estimatedPickupAt:o.estimatedPickupAt,estimatedDeliveryAt:o.estimatedDeliveryAt }));
      return {vehicle,model:s.models.find(m=>m.id===vehicle.modelId),rule:s.availability.find(r=>r.vehicleId===vehicle.id),tasks};
    });res.json(envelope(value));
  }));
  app.put("/api/owner/vehicles/:id/availability", asyncRoute(async (req,res) => {
    const userId=customer(req,config);
    const value=await store.change(s=>{
      const vehicle=s.vehicles.find(v=>v.id===req.params.id) || fail(404,"NOT_FOUND","车辆不存在");
      const owner=s.owners.find(o=>o.id===vehicle.ownerId && o.userId===userId);
      if (!owner) fail(403,"FORBIDDEN","无权修改该车辆");
      const ranges=req.body?.ranges;
      if (!Array.isArray(ranges) || ranges.some((r:any)=>!Array.isArray(r.weekdays)||!/^\d\d:\d\d$/.test(r.startTime)||!/^\d\d:\d\d$/.test(r.endTime)||r.startTime>=r.endTime)) fail(400,"VALIDATION_ERROR","开放时段无效");
      vehicle.ownerShared=!!req.body?.ownerShared; vehicle.updatedAt=now();
      let rule=s.availability.find(r=>r.vehicleId===vehicle.id);
      if (!rule) { rule={ id:id("availability"),vehicleId:vehicle.id,timezone:"Asia/Shanghai",ranges:[],enabled:true,createdAt:now(),updatedAt:now() }; s.availability.push(rule); }
      rule.ranges=ranges; rule.enabled=!!req.body?.enabled; rule.updatedAt=now();
      return { vehicle,rule };
    });
    res.json(envelope(value));
  }));

  app.get("/api/admin/dashboard", asyncRoute(async (req,res) => {
    const a=await admin(req,config,store);
    const value=await store.read(s=>{
      const orders=s.orders.filter(o=>canSeeOrder(s,a,o));
      const count=(...statuses:string[])=>orders.filter(o=>statuses.includes(o.status)).length;
      const dueSoon=orders.filter(o=>o.scheduledPickupAt && Date.parse(o.scheduledPickupAt)>Date.now() && Date.parse(o.scheduledPickupAt)<Date.now()+2*3600_000 && !["completed","cancelled","failed"].includes(o.status)).length;
      return { pendingReview:count("pending_dispatch_review"), pendingPayment:count("pending_payment","pending_customer_quote"), pendingDispatch:count("paid","scheduled","matching"), inProgress:count("dispatched","vehicle_to_pickup","awaiting_loading","delivering","arrived"), dueSoon, exceptions:count("failed"), todayNew:orders.filter(o=>o.createdAt.slice(0,10)===now().slice(0,10)).length };
    }); res.json(envelope(value));
  }));
  app.get("/api/admin/orders", asyncRoute(async (req,res) => {
    const a=await admin(req,config,store);
    const page=Math.max(1,Number(req.query.page)||1),pageSize=20;
    const status=String(req.query.status||""),search=String(req.query.search||"").trim(),region=String(req.query.region||""),from=String(req.query.from||""),to=String(req.query.to||"");
    const value=await store.read(s=>{
      const all=s.orders.filter(o=>canSeeOrder(s,a,o) && (!status||o.status===status) && (!search||o.orderNo.includes(search)||o.sender.contactName.includes(search)||o.sender.contactMobile.includes(search)) && (!region||s.areas.find(area=>area.id===o.serviceRegionId)?.regionId===region) && (!from||o.createdAt.slice(0,10)>=from) && (!to||o.createdAt.slice(0,10)<=to)).sort((x,y)=>y.createdAt.localeCompare(x.createdAt));
      return { items:all.slice((page-1)*pageSize,page*pageSize).map(o=>({ ...orderSummary(o), pickupRegion:s.areas.find(area=>area.id===o.serviceRegionId)?.name, destinationRegion:s.areas.find(area=>area.id===o.destinationServiceRegionId)?.name })),total:all.length,page,pageSize,totalPages:Math.ceil(all.length/pageSize) };
    }); res.json(envelope(value));
  }));
  app.get("/api/admin/orders/:id", asyncRoute(async (req,res) => {
    const a=await admin(req,config,store);
    const value=await store.read(s=>{ const o=getOrder(s,String(req.params.id)); if(!canSeeOrder(s,a,o)) fail(403,"FORBIDDEN","无权查看此区域订单"); return { ...orderDetail(s,o), audit:s.audit.filter(x=>x.orderId===o.id), canOperate:canOperateOrder(s,a,o), candidateVehicles:canOperateOrder(s,a,o)&&["paid","scheduled","matching"].includes(o.status)?eligibleVehicles(s,o).map(v=>({ id:v.id,vehicleNo:v.vehicleNo,batteryPercent:v.batteryPercent,area:s.areas.find(area=>area.id===v.serviceRegionId)?.name,owner:s.owners.find(owner=>owner.id===v.ownerId)?.name })):[] }; });
    res.json(envelope(value));
  }));
  app.post("/api/admin/orders/:id/review", asyncRoute(async (req,res) => { const a=await admin(req,config,store); const value=await store.change(s=>{ const o=getOrder(s,String(req.params.id)); guardVersion(o,req.body?.expectedVersion); return review(s,a,o.id,req.body?.decision==="rejected"?"rejected":"approved",String(req.body?.reason||""),req.body?.replacementModelId); }); res.json(envelope(value)); }));
  app.post("/api/admin/orders/:id/dispatch", asyncRoute(async (req,res) => { const a=await admin(req,config,store); const value=await store.change(s=>{ const o=getOrder(s,String(req.params.id)); guardVersion(o,req.body?.expectedVersion); return dispatch(s,a,o.id,String(req.body?.vehicleId||""),String(req.body?.note||"")); }); res.json(envelope(value)); }));
  app.post("/api/admin/orders/:id/progress", asyncRoute(async (req,res) => { const a=await admin(req,config,store); const value=await store.change(s=>{ const o=getOrder(s,String(req.params.id)); guardVersion(o,req.body?.expectedVersion); return progress(s,a,o.id,req.body?.status,String(req.body?.note||"")); }); res.json(envelope(value)); }));
  app.post("/api/admin/orders/:id/exception", asyncRoute(async (req,res) => { const a=await admin(req,config,store); const value=await store.change(s=>{ const o=getOrder(s,String(req.params.id)); guardVersion(o,req.body?.expectedVersion); return markException(s,a,o.id,String(req.body?.reason||"")); }); res.json(envelope(value)); }));
  app.get("/api/admin/notifications", asyncRoute(async (req,res) => { const a=await admin(req,config,store); const value=await store.read(s=>{ const regions=visibleRegions(s,a); return s.notices.filter(n=>regions.has(n.audienceRegionId)).sort((x,y)=>y.at.localeCompare(x.at)).map(n=>({ ...n,read:n.readBy.includes(a.id) })); }); res.json(envelope(value)); }));
  app.put("/api/admin/notifications/:id/read", asyncRoute(async (req,res) => { const a=await admin(req,config,store); const value=await store.change(s=>{ const n=s.notices.find(n=>n.id===req.params.id)||fail(404,"NOT_FOUND","通知不存在"); if(!visibleRegions(s,a).has(n.audienceRegionId)) fail(403,"FORBIDDEN","无权查看通知"); if(!n.readBy.includes(a.id)) n.readBy.push(a.id); return n; }); res.json(envelope(value)); }));
  app.get("/api/admin/fleet", asyncRoute(async (req,res) => { const a=await admin(req,config,store); const value=await store.read(s=>{ const scope=visibleRegions(s,a); return s.vehicles.filter(v=>scope.has(s.areas.find(area=>area.id===v.serviceRegionId)?.regionId||"")).map(v=>({ ...v,area:s.areas.find(area=>area.id===v.serviceRegionId)?.name,owner:s.owners.find(o=>o.id===v.ownerId)?.name,availability:s.availability.find(r=>r.vehicleId===v.id),activeReservations:s.reservations.filter(r=>r.vehicleId===v.id && !["released","cancelled"].includes(r.status)).length })); }); res.json(envelope(value)); }));
  app.get("/api/admin/vehicle-applications", asyncRoute(async (req,res) => {
    const a=await admin(req,config,store);
    res.json(envelope(await store.read(s=>{const scope=visibleRegions(s,a);return s.vehicleApplications.filter(x=>scope.has(s.areas.find(area=>area.id===x.areaId)?.regionId||"")).map(x=>({...x,area:s.areas.find(v=>v.id===x.areaId)?.name,owner:s.owners.find(v=>v.id===x.ownerId)?.name,model:s.models.find(v=>v.id===x.modelId)?.name}));})));
  }));
  app.post("/api/admin/vehicle-applications/:id/review", asyncRoute(async (req,res) => {
    const a=await admin(req,config,store);
    const decision=req.body?.decision==="approved"?"approved":"rejected";
    const reason=String(req.body?.reason||"").trim();
    const value=await store.change(s=>{
      const application=s.vehicleApplications.find(x=>x.id===req.params.id)||fail(404,"NOT_FOUND","申请不存在");
      const area=s.areas.find(x=>x.id===application.areaId)||fail(404,"NOT_FOUND","服务区不存在");
      if(!visibleRegions(s,a).has(area.regionId)) fail(403,"FORBIDDEN","无权审核该区域车辆");
      if(application.status!=="pending") fail(409,"CONFLICT","该申请已处理");
      if((decision==="rejected"||a.level!=="district"||a.regionId!==area.regionId)&&!reason) fail(400,"REASON_REQUIRED","请填写处理原因");
      application.status=decision;application.reason=reason||undefined;application.reviewedBy=a.id;application.updatedAt=now();
      if(decision==="approved"){
        const timestamp=now();const vehicleId=id("vehicle");
        s.vehicles.push({id:vehicleId,vehicleNo:application.vehicleNo,modelId:application.modelId,ownerId:application.ownerId,serviceRegionId:application.areaId,status:"available",location:area.center,locationUpdatedAt:timestamp,batteryPercent:80,remainingRangeMeters:80000,imageUrls:[application.imageUrl],enabled:true,ownerShared:false,createdAt:timestamp,updatedAt:timestamp});
        s.availability.push({id:id("availability"),vehicleId,timezone:"Asia/Shanghai",ranges:[],enabled:false,createdAt:timestamp,updatedAt:timestamp});application.vehicleId=vehicleId;
      }
      return application;
    });res.json(envelope(value));
  }));
  app.get("/api/admin/models", asyncRoute(async (req,res) => { await admin(req,config,store); res.json(envelope(await store.read(s=>s.models))); }));
  app.put("/api/admin/models/:id/image", express.raw({type:["image/png","image/jpeg","image/webp"],limit:"5mb"}), asyncRoute(async (req,res) => {
    const a=await admin(req,config,store);
    if(a.level!=="headquarters") fail(403,"FORBIDDEN","仅平台可更新车型照片");
    if(!Buffer.isBuffer(req.body)) fail(400,"INVALID_IMAGE","请选择图片");
    const imageUrl=await saveImage(req.body);
    const value=await store.change(s=>{const model=s.models.find(m=>m.id===req.params.id)||fail(404,"NOT_FOUND","车型不存在");model.imageUrl=imageUrl;model.updatedAt=now();return model;});
    res.json(envelope(value));
  }));

  const staticRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../admin-web/dist");
  app.use("/admin",express.static(staticRoot));
  app.get("/admin/{*rest}",(_req,res)=>res.sendFile(path.join(staticRoot,"index.html")));
  app.use((error: unknown,_req:Request,res:Response,_next:NextFunction)=>{
    if(error instanceof ApiError) res.status(error.status).json({ code:error.code,msg:error.message,data:null });
    else { console.error(error); res.status(500).json({ code:"INTERNAL_ERROR",msg:"服务暂时不可用",data:null }); }
  });
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const secret=process.env.SESSION_SECRET;
  const adminPassword=process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!secret || secret.length<32 || !adminPassword || adminPassword.length<12) throw new Error("请设置 SESSION_SECRET（至少32字符）与 ADMIN_BOOTSTRAP_PASSWORD（至少12字符）");
  const config:Config={ secret,appId:process.env.WECHAT_APP_ID,appSecret:process.env.WECHAT_APP_SECRET,demoAuth:process.env.ALLOW_DEMO_AUTH==="true",production:process.env.NODE_ENV==="production" };
  if (config.production && !process.env.DATABASE_URL) throw new Error("生产环境必须配置 DATABASE_URL，避免订单在服务重启后丢失");
  const store=new StateStore(seedState(adminPassword,config.demoAuth&&!config.production),process.env.DATABASE_URL);
  store.init().then(()=>{
    const port=Number(process.env.PORT)||3000;
    createApp(store,config).listen(port,()=>console.log(`车凌驿共享服务已启动：${port}`));
  }).catch(error=>{ console.error(error); process.exitCode=1; });
}
