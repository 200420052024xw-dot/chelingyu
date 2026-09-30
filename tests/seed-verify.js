/**
 * 验证 seed.ts + load-user-mock-data.ts 链路是否正常工作。
 * Node 环境跑，不依赖 wx（用 globalThis.wx 占位）。
 */

// 模拟微信全局对象
globalThis.wx = {
  getFileSystemManager: () => {
    throw new Error("not available in node");
  },
  getStorageSync: () => null,
  setStorageSync: () => {},
  getWindowInfo: () => ({ statusBarHeight: 0, windowWidth: 375 }),
  getMenuButtonBoundingClientRect: () => ({ top: 44, height: 32 }),
};

// 用 ts-node 注册 + 读源码
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs",
    target: "es2017",
    moduleResolution: "node",
    esModuleInterop: true,
    strict: false,
    skipLibCheck: true,
  },
});

const path = require("path");
process.chdir(path.join(__dirname, ".."));

const { createSeedDatabase } = require(path.join(process.cwd(), "miniprogram", "fixtures", "seed.ts"));
const { applyUserMockData } = require(path.join(process.cwd(), "miniprogram", "fixtures", "load-user-mock-data.ts"));

const seed = createSeedDatabase();
const merged = applyUserMockData(seed);

console.log("========== seed summary ==========");
console.log("schemaVersion:", merged.schemaVersion);
console.log("users:", merged.users.length);
console.log("addresses:", merged.addresses.length);
console.log("regions:", merged.regions.length);
console.log("serviceAreas:", merged.serviceAreas.length);
console.log("vehicleModels:", merged.vehicleModels.length);
console.log("vehicles:", merged.vehicles.length);
console.log("availabilityRules:", merged.availabilityRules.length);
console.log("pricingPolicies:", merged.pricingPolicies.length);
console.log("revenueSharingRules:", merged.revenueSharingRules.length);
console.log("notifications:", merged.notifications.length);
console.log("notifications (unread):", merged.notifications.filter((n) => !n.readAt).length);
console.log("orders:", merged.orders.length);
console.log("payments:", merged.payments.length);

console.log("\n========== first vehicle ==========");
const v = merged.vehicles[0];
console.log({
  id: v.id,
  vehicleNo: v.vehicleNo,
  modelId: v.modelId,
  status: v.status,
  batteryPercent: v.batteryPercent,
  remainingRangeKm: (v.remainingRangeMeters / 1000).toFixed(1),
  ownerShared: v.ownerShared,
  location: v.location,
});

console.log("\n========== first pricing policy ==========");
const p = merged.pricingPolicies[0];
console.log({
  name: p.name,
  baseFeeYuan: p.baseFeeFen / 100,
  minimumOrderYuan: p.minimumOrderAmountFen / 100,
  maximumOrderYuan: p.maximumOrderAmountFen / 100,
  extraDistanceFeePerKm: p.extraDistanceFeeFenPerKm / 100,
});

console.log("\n========== revenue sharing ==========");
const r = merged.revenueSharingRules[0];
console.log({
  name: r.name,
  totalBasisPoints: r.shares.reduce((s, x) => s + x.basisPoints, 0),
  shares: r.shares,
});

console.log("\n========== addresses ==========");
merged.addresses.forEach((a) => {
  console.log(`  ${a.id}: ${a.name} (默认寄件=${a.isDefaultSender}, 默认收件=${a.isDefaultReceiver})`);
});

console.log("\n========== env loading ==========");
// 在 node 里 wx.getFileSystemManager 不可用，所以直接用 node fs 读 .env，
// 验证 (1) 文件能读到 (2) parseDotEnv 解析正确
const fs = require("fs");
const envPath = path.join(process.cwd(), "miniprogram", ".env");
let parsed = {};
try {
  const content = fs.readFileSync(envPath, "utf8");
  // 调用 env.ts 里那份 parseDotEnv（用 require 拿不到的私有函数，这里复刻逻辑）
  const map = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx < 0) return;
    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    v = v.replace(/^["'](.*)["']$/, "$1");
    map[k] = v;
  });
  parsed.tencentMapsKey = (map.tencentMapsKey ?? map.TENCENT_MAPS_KEY ?? "").trim();
  parsed.useTencentMapsWebService = ["true","1","yes"].includes(map.USE_TENCENT_MAPS_WEB_SERVICE ?? map.useTencentMapsWebService);
  parsed.mockMode = ["true","1","yes"].includes(map.MOCK_MODE ?? map.mockMode);
  parsed.tencentMapsApiBase = map.tencentMapsApiBase ?? map.TENCENT_MAPS_API_BASE ?? "https://apis.map.qq.com";
  parsed.requestTimeoutMs = parseInt(map.REQUEST_TIMEOUT_MS ?? map.requestTimeoutMs ?? "8000", 10);
} catch (e) {
  console.log("  ⚠ .env 读取失败:", e.message);
}
console.log({
  hasKey: !!parsed.tencentMapsKey,
  keyLength: parsed.tencentMapsKey ? parsed.tencentMapsKey.length : 0,
  keyPrefix: parsed.tencentMapsKey ? parsed.tencentMapsKey.slice(0, 4) + "****" : "(none)",
  useTencentMapsWebService: parsed.useTencentMapsWebService,
  mockMode: parsed.mockMode,
  apiBase: parsed.tencentMapsApiBase,
  requestTimeoutMs: parsed.requestTimeoutMs,
});

console.log("\n✓ 全部加载完成");