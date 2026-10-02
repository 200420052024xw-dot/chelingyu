import type { CargoInfo, DeliveryAddressSnapshot, VehicleModel } from "../miniprogram/contracts/types";
import { areaFor, fail, id, now, priceFor, type AdminAccount, type PriceKey, type PriceRange, type RegionalPricing, type SharedState } from "./state";

export const PRICE_KEYS: PriceKey[] = ["baseFeeFen", "distanceFeeFenPerKm", "coldChainFeeFen"];

function parentId(state: SharedState, regionId: string) {
  if (regionId === "platform") return undefined;
  return state.regions.find(r => r.id === regionId)?.parentId || "platform";
}

export function pricingStatus(state: SharedState, regionId: string): { policy: RegionalPricing; valid: boolean; parent?: RegionalPricing } {
  const policy = state.pricing[regionId] || fail(404, "NOT_FOUND", "价格区域不存在");
  const parentRegion = parentId(state, regionId);
  const parent = parentRegion ? state.pricing[parentRegion] : undefined;
  const ownValid = PRICE_KEYS.every(key => {
    const range = policy.ranges[key];
    const value = policy.values?.[key];
    return range && Number.isInteger(range.min) && Number.isInteger(range.max) && range.min >= 0 && range.min <= range.max
      && (!parent || (range.min >= parent.ranges[key].min && range.max <= parent.ranges[key].max))
      && (value === undefined || (Number.isInteger(value) && value >= range.min && value <= range.max));
  });
  return { policy, parent, valid: !!ownValid && (!parentRegion || pricingStatus(state, parentRegion).valid) };
}

export function savePricing(state: SharedState, admin: AdminAccount, input: { ranges?: Record<PriceKey, PriceRange>; values?: Record<PriceKey, number> }) {
  const regionId = admin.level === "headquarters" ? "platform" : admin.regionId || "";
  const current = state.pricing[regionId] || fail(404, "NOT_FOUND", "价格区域不存在");
  const values=admin.level === "district" ? (input.values || current.values) : undefined;
  const ranges=admin.level === "district" && values
    ? Object.fromEntries(PRICE_KEYS.map(key=>[key,{min:values[key],max:values[key]}])) as RegionalPricing["ranges"]
    : input.ranges || current.ranges;
  const next: RegionalPricing = { ...current, ranges, values, version: current.version + 1, updatedAt: now() };
  if (admin.level === "district" && input.ranges) fail(400, "VALIDATION_ERROR", "区级只能设置执行价格");
  if (admin.level !== "district" && input.values) fail(400, "VALIDATION_ERROR", "上级只能设置价格范围");
  const original = state.pricing[regionId];
  state.pricing[regionId] = next;
  try {
    if (!pricingStatus(state, regionId).valid) fail(400, "PRICE_OUT_OF_RANGE", "价格超出上级授权范围，或价格项无效");
  } catch (error) { state.pricing[regionId] = original; throw error; }
  state.pricingHistory.push({id:id("pricing_change"),regionId,actorId:admin.id,actorName:admin.name,before:structuredClone(original),after:structuredClone(next),at:next.updatedAt});
  return next;
}

export function quoteFor(state: SharedState, sender: DeliveryAddressSnapshot, receiver: DeliveryAddressSnapshot, cargo: CargoInfo, model: VehicleModel) {
  const area = areaFor(state, sender);
  const { policy, valid } = pricingStatus(state, area.regionId);
  if (!valid || !policy.values) fail(409, "PRICE_POLICY_INVALID", "当前区域价格待调整，暂不能报价");
  return { ...priceFor(sender, receiver, cargo, model, policy.values), policyId: `pricing_${area.regionId}`, policyVersion: policy.version };
}
