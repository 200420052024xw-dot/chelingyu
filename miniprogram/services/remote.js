"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sharedFleet = exports.sharedVehicleApplications = exports.sharedPricing = exports.sharedOrders = exports.isSharedMode = void 0;
const env_1 = require("../config/env");
const index_1 = require("../repositories/index");
const tokenKey = "cly:shared:customer-token";
let sessionToken = "";
let authPending = null;
const isSharedMode = () => !!env_1.ENV.orderApiBaseUrl.trim();
exports.isSharedMode = isSharedMode;
const assetUrl = (value) => value.startsWith("/uploads/") ? `${env_1.ENV.orderApiBaseUrl.replace(/\/$/, "")}${value}` : value;
function send(path, method, data, token) {
    return new Promise((resolve, reject) => {
        wx.request({
            url: `${env_1.ENV.orderApiBaseUrl.replace(/\/$/, "")}/api${path}`,
            method,
            data: data,
            timeout: env_1.ENV.requestTimeoutMs,
            header: Object.assign({ "Content-Type": "application/json" }, (token ? { Authorization: `Bearer ${token}` } : {})),
            success(response) {
                const body = response.data;
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    const error = new Error((body === null || body === void 0 ? void 0 : body.msg) || `服务请求失败 (${response.statusCode})`);
                    error.status = response.statusCode;
                    error.code = body === null || body === void 0 ? void 0 : body.code;
                    reject(error);
                    return;
                }
                resolve(body.data);
            },
            fail(error) { reject(new Error(error.errMsg || "无法连接共享服务，请检查网络")); },
        });
    });
}
function loginCode() {
    return new Promise((resolve, reject) => wx.login({ success: result => result.code ? resolve(result.code) : reject(new Error("微信登录未取得凭证")), fail: error => reject(new Error(error.errMsg || "微信登录失败")) }));
}
async function authenticate(force = false) {
    if (!force && sessionToken)
        return sessionToken;
    if (!force) {
        const cached = wx.getStorageSync(tokenKey);
        if (typeof cached === "string" && cached) {
            sessionToken = cached;
            return cached;
        }
    }
    if (authPending)
        return authPending;
    authPending = (async () => {
        const result = env_1.ENV.orderDemoAuth
            ? await send("/auth/demo", "POST", { demoId: "demo-user" })
            : await send("/auth/wechat", "POST", { code: await loginCode() });
        sessionToken = result.token;
        wx.setStorageSync(tokenKey, sessionToken);
        return sessionToken;
    })();
    try {
        return await authPending;
    }
    finally {
        authPending = null;
    }
}
async function request(path, method = "GET", data) {
    const credential = await authenticate();
    try {
        return await send(path, method, data, credential);
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.status) !== 401)
            throw error;
        sessionToken = "";
        wx.removeStorageSync(tokenKey);
        return send(path, method, data, await authenticate(true));
    }
}
exports.sharedOrders = {
    create(draft, quote, requestId) { return request("/orders", "POST", { draft, quote, requestId }); },
    list(status = "all") { return request(`/orders?status=${encodeURIComponent(status)}`); },
    async detail(id) { const view = await request(`/orders/${encodeURIComponent(id)}`); if (view.assignedVehiclePublic)
        view.assignedVehiclePublic.modelImage = assetUrl(view.assignedVehiclePublic.modelImage); return view; },
    pay(id, requestId, scenario, expectedVersion) { return request(`/orders/${encodeURIComponent(id)}/pay-mock`, "POST", { requestId, scenario, expectedVersion }); },
    cancel(id, reason, expectedVersion) { return request(`/orders/${encodeURIComponent(id)}/cancel`, "POST", { reason, expectedVersion }); },
    acceptQuote(id, expectedVersion) { return request(`/orders/${encodeURIComponent(id)}/accept-quote`, "POST", { expectedVersion }); },
    confirmLoaded(id, expectedVersion) { return request(`/orders/${encodeURIComponent(id)}/confirm-loaded`, "POST", { expectedVersion }); },
    confirmReceived(id, expectedVersion) { return request(`/orders/${encodeURIComponent(id)}/confirm-received`, "POST", { expectedVersion }); },
};
exports.sharedPricing = {
    quote(draft, modelId) { return request("/quotes", "POST", { draft, modelId }); },
    async models() { return (await request("/models")).map(m => (Object.assign(Object.assign({}, m), { imageUrl: assetUrl(m.imageUrl) }))); },
    async syncModels() { const models = await this.models(); models.forEach(model => index_1.repo.upsertVehicleModel(model)); return models; },
};
exports.sharedVehicleApplications = {
    async list() { return (await request("/owner/vehicle-applications")).map(x => (Object.assign(Object.assign({}, x), { imageUrl: assetUrl(x.imageUrl) }))); },
    submit(input) { return request("/owner/vehicle-applications", "POST", input); },
};
exports.sharedFleet = {
    regions() { return request("/regions"); },
    async list(areaId) { return (await request(`/fleet${areaId ? `?areaId=${encodeURIComponent(areaId)}` : ""}`)).map(v => (Object.assign(Object.assign({}, v), { model: v.model ? Object.assign(Object.assign({}, v.model), { imageUrl: assetUrl(v.model.imageUrl) }) : undefined }))); },
    ownerVehicles() { return request("/owner/vehicles"); },
    ownerVehicle(id) { return request(`/owner/vehicles/${encodeURIComponent(id)}`); },
    availableDemoVehicles() { return request("/owner/vehicles/available-demo"); },
    bindDemoVehicle(id) { return request(`/owner/vehicles/${encodeURIComponent(id)}/bind-demo`, "POST", {}); },
    saveAvailability(vehicleId, input) {
        return request(`/owner/vehicles/${encodeURIComponent(vehicleId)}/availability`, "PUT", input);
    },
};
