/**
 * 报价相关单元测试
 * 运行：npx ts-node tests/pricing.test.ts
 */

import { computeQuote, computeInputFingerprint, quoteIsValidFor } from "../miniprogram/domain/pricing";
import type {
  OrderDraft,
  PricingPolicy,
  Vehicle,
  VehicleModel,
  DeliveryAddressSnapshot,
  CargoInfo,
} from "../miniprogram/contracts/types";

const sender: DeliveryAddressSnapshot = {
  id: "addr_sender",
  regionId: "region_yaohu",
  contactName: "张三",
  contactPhone: "13800000001",
  detail: "瑶湖图书馆",
  location: { latitude: 28.682, longitude: 115.858 },
};

const receiver: DeliveryAddressSnapshot = {
  id: "addr_receiver",
  regionId: "region_yaohu",
  contactName: "李四",
  contactPhone: "13800000002",
  detail: "5号宿舍楼",
  location: { latitude: 28.685, longitude: 115.862 },
};

const baseCargo: CargoInfo = {
  category: "parcel",
  name: "包裹",
  quantity: 1,
  totalWeightGrams: 2000,
  unitWeightGrams: 2000,
  unitDimensionsMm: { length: 200, width: 200, height: 200 },
  fragile: false,
  needsHandling: false,
};

const model: VehicleModel = {
  id: "model_box_small",
  name: "小箱",
  category: "box",
  maxWeightGrams: 50000,
  maxVolumeMm3: 8000000,
  supportsColdChain: false,
  basePriceFen: 500,
};

const policy: PricingPolicy = {
  id: "policy_default",
  name: "默认",
  version: 1,
  baseFeeFen: 500,
  includedDistanceMeters: 1500,
  extraDistanceFeeFenPerKm: 200,
  minimumOrderAmountFen: 800,
  maximumOrderAmountFen: 50000,
  coldChainSurchargeFen: 100,
};

const vehicles: Vehicle[] = [
  {
    id: "veh_1",
    vehicleNo: "JNU-001",
    modelId: "model_box_small",
    ownerId: "owner_001",
    status: "available",
    location: { latitude: 28.6825, longitude: 115.8585 },
    currentRegionId: "region_yaohu",
    availability: [],
    ownerShared: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

function makeDraft(over: Partial<OrderDraft> = {}): OrderDraft {
  return {
    id: "draft_1",
    userId: "usr_customer_001",
    revision: 1,
    sender,
    receiver,
    cargo: baseCargo,
    serviceTimeMode: "now",
    scheduledPickupAt: undefined,
    requireInsurance: false,
    note: "",
    createdAt: "2026-09-22T08:00:00Z",
    updatedAt: "2026-09-22T08:00:00Z",
    ...over,
  };
}

let pass = 0;
let fail = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    pass++;
    console.log("  ✓", msg);
  } else {
    fail++;
    console.log("  ✗", msg);
  }
}

console.log("\n[pricing] computeQuote 基础报价");
{
  const q = computeQuote({
    draft: makeDraft(),
    policy,
    vehicleModel: model,
    vehicles,
  });
  const total = q.items.reduce((s, i) => s + i.amountFen, 0);
  assert(q.totalAmountFen === total, "总金额等于明细之和");
  assert(q.items.find((i) => i.type === "base_fee") !== undefined, "包含基础运费");
  assert(q.vehicleModelId === "model_box_small", "绑定车型 ID");
  assert(q.draftRevision === 1, "绑定草稿版本");
  assert(typeof q.inputFingerprint === "string" && q.inputFingerprint.length > 0, "生成输入指纹");
  assert(q.estimatedArrivalMinutes >= 3, "ETA 至少 3 分钟");
  assert(q.routeDistanceMeters > 0, "路径距离 > 0");
  assert(new Date(q.expiresAt).getTime() > Date.now(), "报价未过期");
}

console.log("\n[pricing] 冷链附加费");
{
  const coldModel: VehicleModel = { ...model, id: "model_cold", supportsColdChain: true };
  const q = computeQuote({
    draft: makeDraft({
      cargo: { ...baseCargo, category: "fresh_cold_chain" },
    }),
    policy,
    vehicleModel: coldModel,
    vehicles,
  });
  const coldItem = q.items.find((i) => i.type === "cargo_fee");
  assert(coldItem !== undefined && coldItem.amountFen === 100, "冷链费 100 分");
}

console.log("\n[pricing] 最低收费补足");
{
  const tinyPolicy: PricingPolicy = { ...policy, baseFeeFen: 100, minimumOrderAmountFen: 800 };
  const q = computeQuote({
    draft: makeDraft(),
    policy: tinyPolicy,
    vehicleModel: model,
    vehicles,
  });
  const minItem = q.items.find((i) => i.type === "minimum_adjustment");
  assert(minItem !== undefined, "补足条目存在");
  assert(q.totalAmountFen === 800, "总金额被补足到 800 分");
}

console.log("\n[pricing] 缺少地址时抛错");
{
  let threw = false;
  try {
    computeQuote({
      draft: makeDraft({ sender: undefined }),
      policy,
      vehicleModel: model,
      vehicles,
    });
  } catch (e) {
    threw = true;
  }
  assert(threw, "缺少地址时抛错");
}

console.log("\n[pricing] fingerprint 随草稿变更");
{
  const a = makeDraft();
  const b = makeDraft({ revision: 2, note: "修改备注" });
  const fa = computeInputFingerprint(a, model.id);
  const fb = computeInputFingerprint(b, model.id);
  assert(fa !== fb, "草稿变更后 fingerprint 不同");
}

console.log("\n[pricing] quoteIsValidFor 过期检测");
{
  const q = computeQuote({
    draft: makeDraft(),
    policy,
    vehicleModel: model,
    vehicles,
  });
  // 正常状态有效
  assert(quoteIsValidFor(q, makeDraft(), model.id), "同版本草稿 + 未过期 = 有效");
  // 修改草稿后失效
  assert(!quoteIsValidFor(q, makeDraft({ revision: 2 }), model.id), "草稿版本变更 = 失效");
  // 切换车型失效
  assert(!quoteIsValidFor(q, makeDraft(), "other_model"), "切换车型 = 失效");
}

console.log(`\n共 ${pass + fail} 用例：通过 ${pass}，失败 ${fail}`);
process.exit(fail === 0 ? 0 : 1);
