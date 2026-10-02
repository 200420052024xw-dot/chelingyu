"use strict";
/**
 * 运行时环境配置（key、域名、开关）。
 *
 * 用法：
 *   import { ENV } from "./env";
 *   wx.request({ url: `${ENV.tencentMapsApiBase}/ws/distance`, data: { key: ENV.tencentMapsKey, ... } });
 *
 * 约定：
 *   - 优先使用构建时从 miniprogram/.env 生成的配置（生成文件被 .gitignore 忽略）
 *   - 也兼容 env.local.ts；没有配置时使用 ENV_DEFAULTS
 *
 * 关于腾讯地图 key：
 *   - 小程序原生 <map> 组件无需 key：腾讯地图瓦片由微信客户端按 AppID 自动提供
 *   - WebService API（地理编码、距离矩阵、路线规划）需要在 https://lbs.qq.com/ 单独申请 key
 *   - 申请时"应用类型"选「微信小程序」，"APPID" 填 project.config.json 里的 appid
 */
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
exports.reportEnvStatus = reportEnvStatus;
const ENV_DEFAULTS = {
    orderApiBaseUrl: "",
    orderDemoAuth: false,
    tencentMapsKey: "",
    useTencentMapsWebService: false,
    tencentMapsApiBase: "https://apis.map.qq.com",
    requestTimeoutMs: 8000,
    mockMode: true,
};
// 加载 env.local.ts（用户填的真实值）。失败时给空对象。
function loadLocal() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require("./env.local");
        if (mod && mod.ENV_LOCAL && typeof mod.ENV_LOCAL === "object") {
            return mod.ENV_LOCAL;
        }
        return {};
    }
    catch (e) {
        // env.local.ts 不存在是合法状态 —— 此时用 defaults
        return {};
    }
}
/**
 * 解析 .env 风格文件（KEY=value，# 开头是注释）。
 * 支持的字段名（大小写都接受）：
 *   TENCENT_MAPS_KEY / tencentMapsKey
 *   USE_TENCENT_MAPS_WEB_SERVICE / useTencentMapsWebService (true|false)
 *   TENCENT_MAPS_API_BASE / tencentMapsApiBase
 *   REQUEST_TIMEOUT_MS / requestTimeoutMs
 *   MOCK_MODE / mockMode (true|false)
 */
function parseDotEnv(content) {
    var _a, _b, _c;
    const map = {};
    content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#"))
            return;
        const idx = trimmed.indexOf("=");
        if (idx < 0)
            return;
        const k = trimmed.slice(0, idx).trim();
        let v = trimmed.slice(idx + 1).trim();
        // 去掉首尾成对引号
        v = v.replace(/^["'](.*)["']$/, "$1");
        map[k] = v;
    });
    const out = {};
    if (map.ORDER_API_BASE_URL || map.orderApiBaseUrl)
        out.orderApiBaseUrl = (_a = map.ORDER_API_BASE_URL) !== null && _a !== void 0 ? _a : map.orderApiBaseUrl;
    if (map.tencentMapsKey || map.TENCENT_MAPS_KEY) {
        out.tencentMapsKey = ((_b = map.tencentMapsKey) !== null && _b !== void 0 ? _b : map.TENCENT_MAPS_KEY).trim();
    }
    const flagStr = (k) => map[k] === "true" || map[k] === "1" || map[k] === "yes";
    const flag = (snake, camel) => {
        if (map[snake] !== undefined)
            return flagStr(snake);
        if (map[camel] !== undefined)
            return flagStr(camel);
        return undefined;
    };
    const demoAuth = flag("ORDER_DEMO_AUTH", "orderDemoAuth");
    if (demoAuth !== undefined)
        out.orderDemoAuth = demoAuth;
    const webSvc = flag("USE_TENCENT_MAPS_WEB_SERVICE", "useTencentMapsWebService");
    if (webSvc !== undefined)
        out.useTencentMapsWebService = webSvc;
    if (map.tencentMapsApiBase || map.TENCENT_MAPS_API_BASE) {
        out.tencentMapsApiBase = ((_c = map.tencentMapsApiBase) !== null && _c !== void 0 ? _c : map.TENCENT_MAPS_API_BASE);
    }
    const to = flag("REQUEST_TIMEOUT_MS", "requestTimeoutMs");
    if (map.requestTimeoutMs !== undefined) {
        const n = parseInt(map.requestTimeoutMs, 10);
        if (!isNaN(n))
            out.requestTimeoutMs = n;
    }
    else if (map.REQUEST_TIMEOUT_MS !== undefined) {
        const n = parseInt(map.REQUEST_TIMEOUT_MS, 10);
        if (!isNaN(n))
            out.requestTimeoutMs = n;
    }
    const mock = flag("MOCK_MODE", "mockMode");
    if (mock !== undefined)
        out.mockMode = mock;
    return out;
}
/**
 * 尝试从 miniprogram/.env 读取（如果存在）。
 * 文件必须放在 miniprogram/ 内才会被打包进来 —— root .env 读不到。
 */
function loadDotEnv() {
    try {
        // 微信小程序运行时可用 fs API 读相对路径（相对 miniprogram/）
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fs = wx.getFileSystemManager();
        if (!fs || typeof fs.readFileSync !== "function")
            return {};
        // 兼容两种常见放法
        const candidates = ["./.env", "./.env.local", "./config/.env"];
        for (const p of candidates) {
            try {
                const content = fs.readFileSync(p, "utf8");
                if (content && content.length > 0) {
                    return parseDotEnv(content);
                }
            }
            catch (_) {
                // 试下一个
            }
        }
        return {};
    }
    catch (e) {
        return {};
    }
}
const LOCAL = loadLocal();
const DOTENV = loadDotEnv();
function loadGenerated() {
    try {
        const mod = require("./env.generated");
        return mod.ENV_GENERATED || {};
    }
    catch (_) {
        return {};
    }
}
const GENERATED = loadGenerated();
exports.ENV = {
    orderApiBaseUrl: (_c = (_b = (_a = GENERATED.orderApiBaseUrl) !== null && _a !== void 0 ? _a : LOCAL.orderApiBaseUrl) !== null && _b !== void 0 ? _b : DOTENV.orderApiBaseUrl) !== null && _c !== void 0 ? _c : ENV_DEFAULTS.orderApiBaseUrl,
    orderDemoAuth: (_f = (_e = (_d = GENERATED.orderDemoAuth) !== null && _d !== void 0 ? _d : LOCAL.orderDemoAuth) !== null && _e !== void 0 ? _e : DOTENV.orderDemoAuth) !== null && _f !== void 0 ? _f : ENV_DEFAULTS.orderDemoAuth,
    tencentMapsKey: (GENERATED.tencentMapsKey || LOCAL.tencentMapsKey || DOTENV.tencentMapsKey || ENV_DEFAULTS.tencentMapsKey).trim(),
    useTencentMapsWebService: (_j = (_h = (_g = GENERATED.useTencentMapsWebService) !== null && _g !== void 0 ? _g : (LOCAL.tencentMapsKey ? LOCAL.useTencentMapsWebService : undefined)) !== null && _h !== void 0 ? _h : DOTENV.useTencentMapsWebService) !== null && _j !== void 0 ? _j : ENV_DEFAULTS.useTencentMapsWebService,
    tencentMapsApiBase: (_m = (_l = (_k = GENERATED.tencentMapsApiBase) !== null && _k !== void 0 ? _k : LOCAL.tencentMapsApiBase) !== null && _l !== void 0 ? _l : DOTENV.tencentMapsApiBase) !== null && _m !== void 0 ? _m : ENV_DEFAULTS.tencentMapsApiBase,
    requestTimeoutMs: (_q = (_p = (_o = GENERATED.requestTimeoutMs) !== null && _o !== void 0 ? _o : LOCAL.requestTimeoutMs) !== null && _p !== void 0 ? _p : DOTENV.requestTimeoutMs) !== null && _q !== void 0 ? _q : ENV_DEFAULTS.requestTimeoutMs,
    mockMode: (_t = (_s = (_r = GENERATED.mockMode) !== null && _r !== void 0 ? _r : LOCAL.mockMode) !== null && _s !== void 0 ? _s : DOTENV.mockMode) !== null && _t !== void 0 ? _t : ENV_DEFAULTS.mockMode,
};
/**
 * 启动期自检：缺关键 key 时在控制台打 warn，不抛错（演示模式允许无 key 运行）。
 */
function reportEnvStatus() {
    const lines = [];
    if (exports.ENV.useTencentMapsWebService && !exports.ENV.tencentMapsKey) {
        lines.push("⚠ 腾讯地图 WebService key 未配置。");
        lines.push("  任选一种 ↓");
        lines.push("    1) miniprogram/config/env.local.ts  →  填入 ENV_LOCAL.tencentMapsKey");
        lines.push("    2) miniprogram/.env                 →  TENCENT_MAPS_KEY=OB4BZ-...");
        lines.push("  （根目录 .env 不会被小程序运行时读到，必须放在 miniprogram/ 内）");
    }
    else if (exports.ENV.tencentMapsKey) {
        const masked = exports.ENV.tencentMapsKey.slice(0, 4) + "****" + exports.ENV.tencentMapsKey.slice(-4);
        lines.push(`✓ tencentMapsKey = ${masked}`);
    }
    lines.push(`• useTencentMapsWebService = ${exports.ENV.useTencentMapsWebService}`);
    lines.push(`• 本地模拟接口 = ${exports.ENV.mockMode ? "已启用" : "已关闭"}`);
    lines.push(`• apiBase = ${exports.ENV.tencentMapsApiBase}`);
    lines.push(`• 共享订单 API = ${exports.ENV.orderApiBaseUrl || "未配置，使用本地演示数据"}`);
    console.info("[env]\n  " + lines.join("\n  "));
}
