/** Shared order API. Local draft editing stays on device until the order is submitted. */
import type { DeliveryOrder, OrderDetailView, OrderDraft, Quote, Vehicle, VehicleAvailabilityRule, VehicleModel, WeeklyTimeRange } from "../contracts/types";
import { ENV } from "../config/env";
import { repo } from "../repositories/index";

type Envelope<T> = { code: string; msg: string; data: T };
type RequestMethod = "GET" | "POST" | "PUT";
const tokenKey = "cly:shared:customer-token";
let sessionToken = "";
let authPending: Promise<string> | null = null;
export const isSharedMode = () => !!ENV.orderApiBaseUrl.trim();
const assetUrl = (value: string) => value.startsWith("/uploads/") ? `${ENV.orderApiBaseUrl.replace(/\/$/, "")}${value}` : value;

function send<T>(path: string, method: RequestMethod, data?: unknown, token?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    wx.request({
      url: `${ENV.orderApiBaseUrl.replace(/\/$/, "")}/api${path}`,
      method,
      data: data as any,
      timeout: ENV.requestTimeoutMs,
      header: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      success(response) {
        const body = response.data as Envelope<T>;
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const error = new Error(body?.msg || `服务请求失败 (${response.statusCode})`) as Error & { status?: number; code?: string };
          error.status = response.statusCode; error.code = body?.code;
          reject(error); return;
        }
        resolve(body.data);
      },
      fail(error) { reject(new Error(error.errMsg || "无法连接共享服务，请检查网络")); },
    });
  });
}
function loginCode(): Promise<string> {
  return new Promise((resolve, reject) => wx.login({ success: result => result.code ? resolve(result.code) : reject(new Error("微信登录未取得凭证")), fail: error => reject(new Error(error.errMsg || "微信登录失败")) }));
}
async function authenticate(force = false): Promise<string> {
  if (!force && sessionToken) return sessionToken;
  if (!force) {
    const cached = wx.getStorageSync(tokenKey);
    if (typeof cached === "string" && cached) { sessionToken = cached; return cached; }
  }
  if (authPending) return authPending;
  authPending = (async () => {
    const result = ENV.orderDemoAuth
      ? await send<{ token: string }>("/auth/demo", "POST", { demoId: "demo-user" })
      : await send<{ token: string }>("/auth/wechat", "POST", { code: await loginCode() });
    sessionToken = result.token;
    wx.setStorageSync(tokenKey, sessionToken);
    return sessionToken;
  })();
  try { return await authPending; } finally { authPending = null; }
}
async function request<T>(path: string, method: RequestMethod = "GET", data?: unknown): Promise<T> {
  const credential = await authenticate();
  try { return await send<T>(path, method, data, credential); }
  catch (error: any) {
    if (error?.status !== 401) throw error;
    sessionToken = ""; wx.removeStorageSync(tokenKey);
    return send<T>(path, method, data, await authenticate(true));
  }
}
export interface SharedOrderRow extends DeliveryOrder { pickupRegion?: string; destinationRegion?: string; }
export interface CooperationContactView { regionId:string;teamName:string;phone?:string;wechat?:string;email?:string;sourceRegionId:string;sourceRegionName:string }
export const sharedCooperation = {
  contact(adcode = "") { return send<CooperationContactView|null>(`/cooperation-contact?adcode=${encodeURIComponent(adcode)}`,"GET"); },
};
export const sharedOrders = {
  create(draft: OrderDraft, quote: Quote, requestId: string) { return request<DeliveryOrder>("/orders", "POST", { draft, quote, requestId }); },
  list(status: string = "all") { return request<SharedOrderRow[]>(`/orders?status=${encodeURIComponent(status)}`); },
  async detail(id: string) { const view=await request<OrderDetailView>(`/orders/${encodeURIComponent(id)}`); if(view.assignedVehiclePublic) view.assignedVehiclePublic.modelImage=assetUrl(view.assignedVehiclePublic.modelImage); return view; },
  pay(id: string, requestId: string, scenario: "success" | "fail", expectedVersion?: number) { return request<{ order: DeliveryOrder }>(`/orders/${encodeURIComponent(id)}/pay-mock`, "POST", { requestId, scenario, expectedVersion }); },
  cancel(id: string, reason: string, expectedVersion?: number) { return request<DeliveryOrder>(`/orders/${encodeURIComponent(id)}/cancel`, "POST", { reason, expectedVersion }); },
  acceptQuote(id: string, expectedVersion?: number) { return request<DeliveryOrder>(`/orders/${encodeURIComponent(id)}/accept-quote`, "POST", { expectedVersion }); },
  confirmLoaded(id: string, expectedVersion?: number) { return request<DeliveryOrder>(`/orders/${encodeURIComponent(id)}/confirm-loaded`, "POST", { expectedVersion }); },
  confirmReceived(id: string, expectedVersion?: number) { return request<DeliveryOrder>(`/orders/${encodeURIComponent(id)}/confirm-received`, "POST", { expectedVersion }); },
};
export const sharedPricing = {
  quote(draft: OrderDraft, modelId: string) { return request<Quote>("/quotes", "POST", { draft, modelId }); },
  async models() { return (await request<VehicleModel[]>("/models")).map(m=>({...m,imageUrl:assetUrl(m.imageUrl)})); },
  async syncModels() { const models=await this.models(); models.forEach(model=>repo.upsertVehicleModel(model)); return models; },
};
export interface VehicleApplicationView { id: string; vehicleNo: string; modelId: string; areaId: string; imageUrl: string; status: "pending" | "approved" | "rejected"; reason?: string; }
export const sharedVehicleApplications = {
  async list() { return (await request<VehicleApplicationView[]>("/owner/vehicle-applications")).map(x=>({...x,imageUrl:assetUrl(x.imageUrl)})); },
  submit(input: { vehicleNo: string; modelId: string; areaId: string; imageBase64: string }) { return request<VehicleApplicationView>("/owner/vehicle-applications", "POST", input); },
};
export const sharedFleet = {
  regions() { return request<{regions:Array<{id:string;name:string;level:string}>;areas:Array<{id:string;name:string;regionId:string}>}>("/regions"); },
  async list(areaId?: string) { return (await request<Array<Vehicle & { model?: VehicleModel }>>(`/fleet${areaId ? `?areaId=${encodeURIComponent(areaId)}` : ""}`)).map(v=>({...v,model:v.model?{...v.model,imageUrl:assetUrl(v.model.imageUrl)}:undefined})); },
  ownerVehicles() { return request<Array<{ vehicle: Vehicle; rule?: VehicleAvailabilityRule; model?: VehicleModel }>>("/owner/vehicles"); },
  ownerVehicle(id: string) { return request<{ vehicle: Vehicle; rule?: VehicleAvailabilityRule; model?: VehicleModel; tasks: any[] }>(`/owner/vehicles/${encodeURIComponent(id)}`); },
  availableDemoVehicles() { return request<Array<Vehicle & { model?: VehicleModel }>>("/owner/vehicles/available-demo"); },
  bindDemoVehicle(id: string) { return request<Vehicle>(`/owner/vehicles/${encodeURIComponent(id)}/bind-demo`, "POST", {}); },
  saveAvailability(vehicleId: string, input: { ranges: WeeklyTimeRange[]; enabled: boolean; ownerShared: boolean }) {
    return request<{ vehicle: Vehicle; rule: VehicleAvailabilityRule }>(`/owner/vehicles/${encodeURIComponent(vehicleId)}/availability`, "PUT", input);
  },
};
