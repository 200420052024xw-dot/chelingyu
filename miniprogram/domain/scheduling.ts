/** 调度：评估车辆可调度性，按距离/适配性排序。 */

import type {
  CargoInfo,
  DeliveryAddressSnapshot,
  GeoPoint,
  NearbyVehicleView,
  OrderDraft,
  Vehicle,
  VehicleAvailabilityRule,
  VehicleModel,
  WeeklyTimeRange,
} from "../contracts/types";
import { haversineMeters } from "../adapters/geo";

export interface SchedulingCheck {
  ok: boolean;
  reasons: string[];
}

export function evaluateVehicleForCargo(
  v: Vehicle,
  model: VehicleModel,
  cargo: CargoInfo | undefined,
): SchedulingCheck {
  const reasons: string[] = [];
  if (!v.enabled) reasons.push("车辆已停用");
  if (!v.ownerShared) reasons.push("车主未开启共享");
  if (!["available"].includes(v.status)) reasons.push(`车辆状态非可用（${v.status}）`);
  if (!model.supportedCargoCategories.includes(cargo?.category ?? "general")) {
    reasons.push("当前车型不支持该货物类型");
  }
  if (cargo?.category === "fresh_cold_chain" && !model.supportsColdChain) {
    reasons.push("该货物需要冷链车型");
  }
  if (cargo?.unitWeightGrams) {
    const totalWeight = cargo.unitWeightGrams * cargo.quantity;
    if (totalWeight > model.maxLoadGrams) {
      reasons.push(`货物总重 ${Math.round(totalWeight / 1000)}kg 超出该车型最大载重`);
    }
  }
  if (
    cargo?.unitDimensionsMm &&
    model.cargoBoxDimensionsMm &&
    (cargo.unitDimensionsMm.length > model.cargoBoxDimensionsMm.length ||
      cargo.unitDimensionsMm.width > model.cargoBoxDimensionsMm.width ||
      cargo.unitDimensionsMm.height > model.cargoBoxDimensionsMm.height)
  ) {
    reasons.push("货物尺寸超过该车型货厢");
  }
  if (v.batteryPercent !== undefined && v.batteryPercent < 20) {
    reasons.push("电量不足");
  }
  if (v.remainingRangeMeters !== undefined && v.remainingRangeMeters < 1000) {
    reasons.push("续航不足");
  }
  return { ok: reasons.length === 0, reasons };
}

export function isWithinAvailability(
  rule: VehicleAvailabilityRule | undefined,
  at: Date,
): boolean {
  if (!rule || !rule.enabled) return false;
  // ISO weekday: 1 (Mon) ... 7 (Sun)
  const wd = ((at.getDay() + 6) % 7) + 1;
  const minutes = at.getHours() * 60 + at.getMinutes();
  for (const r of rule.ranges) {
    if (!r.weekdays.includes(wd as WeeklyTimeRange["weekdays"][number])) continue;
    const [sh, sm] = r.startTime.split(":").map(Number);
    const [eh, em] = r.endTime.split(":").map(Number);
    if (minutes >= sh * 60 + sm && minutes < eh * 60 + em) return true;
  }
  return false;
}

export function buildNearbyVehicleView(
  v: Vehicle,
  model: VehicleModel,
  userLocation: GeoPoint,
  rule: VehicleAvailabilityRule | undefined,
  recommended: boolean,
  tags: string[],
): NearbyVehicleView {
  const distance = v.location ? haversineMeters(v.location, userLocation) : 9999;
  const etaMin = Math.max(3, Math.round((distance / 1000 / 30) * 60));
  return {
    vehicleId: v.id,
    vehicleNo: v.vehicleNo,
    modelId: model.id,
    modelName: model.name,
    modelImage: model.imageUrl,
    category: model.category,
    batteryPercent: v.batteryPercent ?? 0,
    remainingRangeMeters: v.remainingRangeMeters ?? 0,
    maxLoadGrams: model.maxLoadGrams,
    cargoVolumeLiters: model.cargoVolumeLiters,
    availableTimeRanges: rule?.ranges ?? [],
    location: v.location ?? userLocation,
    distanceToUserMeters: distance,
    estimatedArrivalMinutes: etaMin,
    recommended,
    recommendationTags: tags,
  };
}

/** 调度：按 distanceToPickup 排序，返回最佳车辆；返回 null 表示 NO_CAPACITY */
export function pickDispatchedVehicle(
  vehicles: Vehicle[],
  models: Map<string, VehicleModel>,
  draft: OrderDraft,
  rules: Map<string, VehicleAvailabilityRule>,
  now: Date,
): { vehicle: Vehicle; model: VehicleModel; distance: number } | null {
  if (!draft.sender) return null;
  const pickup: GeoPoint = draft.sender.location;

  const candidates = vehicles
    .map((v) => {
      if (draft.selectedVehicleModelId && v.modelId !== draft.selectedVehicleModelId) return null;
      const m = models.get(v.modelId);
      const rule = rules.get(v.id);
      if (!m) return null;
      if (!v.enabled) return null;
      if (!v.ownerShared) return null;
      if (v.status !== "available") return null;
      const startAt = draft.scheduledPickupAt ? new Date(draft.scheduledPickupAt) : now;
      if (!isWithinAvailability(rule, startAt)) return null;
      const check = evaluateVehicleForCargo(v, m, draft.cargo);
      if (!check.ok) return null;
      const distance = v.location ? haversineMeters(v.location, pickup) : Number.POSITIVE_INFINITY;
      return { vehicle: v, model: m, distance };
    })
    .filter(Boolean) as Array<{ vehicle: Vehicle; model: VehicleModel; distance: number }>;

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.distance - b.distance || a.vehicle.id.localeCompare(b.vehicle.id));
  return candidates[0];
}

export function recommendModels(
  models: VehicleModel[],
  vehicles: Vehicle[],
  draft: OrderDraft,
  userLocation: GeoPoint,
  rules: Map<string, VehicleAvailabilityRule>,
): Array<{
  model: VehicleModel;
  availableCount: number;
  nearestDistance: number;
  etaMinutes: number;
  recommended: boolean;
  available: boolean;
  unavailableReasons: string[];
  tags: string[];
}> {
  const now = new Date();
  return models.map((m) => {
    const candidates = vehicles.filter((v) => v.modelId === m.id && v.enabled && v.ownerShared);
    const matched: Vehicle[] = [];
    const reasons: string[] = [];
    for (const v of candidates) {
      const rule = rules.get(v.id);
      const startAt = draft.scheduledPickupAt ? new Date(draft.scheduledPickupAt) : now;
      if (!isWithinAvailability(rule, startAt)) continue;
      const c = evaluateVehicleForCargo(v, m, draft.cargo);
      if (c.ok) matched.push(v);
      else if (reasons.length === 0) reasons.push(...c.reasons);
    }
    const distances = matched
      .filter((v) => v.location)
      .map((v) => haversineMeters(v.location as GeoPoint, draft.sender?.location ?? userLocation));
    const minDist = distances.length ? Math.min(...distances) : 9999;
    const eta = Math.max(3, Math.round((minDist / 1000 / 30) * 60));
    const recommended =
      !!draft.cargo && m.supportedCargoCategories.includes(draft.cargo.category) && matched.length > 0;
    const tags: string[] = [];
    if (recommended) tags.push("适合当前物品");
    if (m.category === "box_small") tags.push("性价比高");
    if (m.category === "box_medium") tags.push("空间更大");
    if (m.cargoVolumeLiters >= 4000) tags.push("适合大件");
    if (m.supportsColdChain) tags.push("温控运输");
    if (m.supportsColdChain) tags.push("冷藏保鲜");
    return {
      model: m,
      availableCount: matched.length,
      nearestDistance: minDist,
      etaMinutes: eta,
      recommended,
      available: matched.length > 0,
      unavailableReasons: matched.length === 0 ? reasons : [],
      tags: Array.from(new Set(tags)),
    };
  });
}
