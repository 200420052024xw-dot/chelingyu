"use strict";
/**
 * 腾讯位置服务 WebService API 适配层。
 *
 * 启用条件：ENV.tencentMapsKey 非空 + ENV.useTencentMapsWebService = true
 * 关闭时所有方法直接 reject，调用方应回落 mock 实现。
 *
 * 主要接口：
 *   - distance(a, b)        : 驾车/步行距离矩阵
 *   - geocode(address)       : 地址 → 坐标
 *   - reverseGeocode(point)  : 坐标 → 地址
 *   - route(a, b)            : 路径规划（折线坐标）
 *
 * API 文档：https://lbs.qq.com/serviceWebServiceGuide/webServiceGuide
 *   - /ws/distance/v1          距离矩阵
 *   - /ws/geocoder/v1          地理编码
 *   - /ws/geocoder/v1?get_poi=1 逆地理编码
 *   - /ws/direction/v1/driving  驾车路线规划
 *
 * 错误约定：所有方法 reject 一个带 code/message 的 Error，方便上层区分
 *   - TENCENT_KEY_MISSING  : 没填 key
 *   - TENCENT_DISABLED     : useTencentMapsWebService = false
 *   - TENCENT_HTTP_FAILED  : 网络/HTTP 失败
 *   - TENCENT_API_FAILED   : 业务 status != 0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TencentMapsError = void 0;
exports.distanceByWebService = distanceByWebService;
exports.geocodeByWebService = geocodeByWebService;
exports.reverseGeocodeByWebService = reverseGeocodeByWebService;
exports.suggestPlaces = suggestPlaces;
exports.isWebServiceEnabled = isWebServiceEnabled;
const env_1 = require("../config/env");
class TencentMapsError extends Error {
    constructor(code, message, status) {
        super(message);
        this.code = code;
        this.status = status;
    }
}
exports.TencentMapsError = TencentMapsError;
function ensureEnabled() {
    if (!env_1.ENV.useTencentMapsWebService) {
        throw new TencentMapsError("TENCENT_DISABLED", "useTencentMapsWebService = false");
    }
    if (!env_1.ENV.tencentMapsKey) {
        throw new TencentMapsError("TENCENT_KEY_MISSING", "tencentMapsKey 未配置（miniprogram/config/env.local.ts）");
    }
}
function request({ path, params }) {
    ensureEnabled();
    const qs = Object.keys(params)
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`)
        .join("&");
    const url = `${env_1.ENV.tencentMapsApiBase}${path}?${qs}&key=${env_1.ENV.tencentMapsKey}`;
    return new Promise((resolve, reject) => {
        wx.request({
            url,
            method: "GET",
            timeout: env_1.ENV.requestTimeoutMs,
            success: (res) => {
                var _a;
                if (res.statusCode !== 200) {
                    reject(new TencentMapsError("TENCENT_HTTP_FAILED", `HTTP ${res.statusCode}`, res.statusCode));
                    return;
                }
                const body = res.data;
                // 腾讯位置服务统一响应：{ status: 0, message: "query ok", result: {...} }
                if (body && typeof body.status === "number" && body.status !== 0) {
                    reject(new TencentMapsError("TENCENT_API_FAILED", (_a = body.message) !== null && _a !== void 0 ? _a : `status=${body.status}`, body.status));
                    return;
                }
                resolve(body);
            },
            fail: (err) => {
                var _a;
                reject(new TencentMapsError("TENCENT_HTTP_FAILED", (_a = err.errMsg) !== null && _a !== void 0 ? _a : "网络请求失败"));
            },
        });
    });
}
// === 接口实现 ===
/**
 * 直线/驾车距离矩阵。
 * 文档：/ws/distance/v1/?mode=driving&from=lat,lng&to=lat,lng&key=xxx
 */
async function distanceByWebService(from, to, mode = "driving") {
    const fromStr = `${from.latitude},${from.longitude}`;
    const toStr = `${to.latitude},${to.longitude}`;
    const res = await request({
        path: "/ws/distance/v1",
        params: { mode, from: fromStr, to: toStr },
    });
    const el = res.result.elements[0];
    if (!el) {
        throw new TencentMapsError("TENCENT_API_FAILED", "距离结果为空");
    }
    return { meters: el.distance, durationSeconds: el.duration };
}
/**
 * 地址 → 坐标（地理编码）。
 */
async function geocodeByWebService(address, region) {
    var _a;
    const params = {
        address,
        output: "json",
    };
    if (region)
        params.region = region;
    const res = await request({
        path: "/ws/geocoder/v1",
        params,
    });
    if (!((_a = res.result) === null || _a === void 0 ? void 0 : _a.location)) {
        throw new TencentMapsError("TENCENT_API_FAILED", "地理编码结果为空");
    }
    return { latitude: res.result.location.lat, longitude: res.result.location.lng };
}
/**
 * 坐标 → 地址（逆地理编码）。
 */
async function reverseGeocodeByWebService(point) {
    var _a, _b, _c, _d, _e;
    const res = await request({
        path: "/ws/geocoder/v1",
        params: {
            location: `${point.latitude},${point.longitude}`,
            get_poi: 0,
            output: "json",
        },
    });
    if (!((_a = res.result) === null || _a === void 0 ? void 0 : _a.address)) {
        throw new TencentMapsError("TENCENT_API_FAILED", "逆地理编码结果为空");
    }
    return {
        name: ((_b = res.result.formatted_addresses) === null || _b === void 0 ? void 0 : _b.recommend) || ((_c = res.result.formatted_addresses) === null || _c === void 0 ? void 0 : _c.rough) || res.result.address,
        address: res.result.address,
        adcode: (_e = (_d = res.result.ad_info) === null || _d === void 0 ? void 0 : _d.adcode) !== null && _e !== void 0 ? _e : "",
    };
}
/** 地点名称搜索；腾讯 key 未启用时由页面使用微信原生选点兜底。 */
async function suggestPlaces(keyword, region) {
    var _a;
    const params = { keyword, page_size: 15, output: "json" };
    if (region)
        params.region = region;
    const res = await request({ path: "/ws/place/v1/suggestion", params });
    return ((_a = res.data) !== null && _a !== void 0 ? _a : []).filter((p) => p.location).map((p) => {
        var _a, _b, _c;
        return ({
            id: p.id,
            title: p.title,
            address: (_a = p.address) !== null && _a !== void 0 ? _a : "",
            city: (_b = p.city) !== null && _b !== void 0 ? _b : "",
            adcode: (_c = p.adcode) !== null && _c !== void 0 ? _c : "",
            location: { latitude: p.location.lat, longitude: p.location.lng },
        });
    });
}
/**
 * 单一出口：是否真正启用 WebService。
 */
function isWebServiceEnabled() {
    return env_1.ENV.useTencentMapsWebService && env_1.ENV.tencentMapsKey.length > 0;
}
