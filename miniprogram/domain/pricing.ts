/** 计价：生成报价（不可变快照）。 */

import type {
  CargoInfo,
  DeliveryAddressSnapshot,
  MoneyFen,
  OrderDraft,
  PriceItem,
  PricingPolicy,
  Quote,
  Vehicle,
  VehicleModel,
} from "../contracts/types";
import { haversineMeters } from "../adapters/geo";
import { clock } from "../adapters/clock";
import { identity } from "../adapters/identity";
import { sumPriceItems } from "./validators";

export interface QuoteInput {
  draft: OrderDraft;
  policy: PricingPolicy;
  vehicleModel: VehicleModel;
  vehicles: Vehicle[];
  /** 用于最近 ETA 估算 */
  selectedVehicle?: Vehicle;
}

const QUOTE_TTL_MS = 5 * 60 * 1000; // 5 分钟有效

export function routeDistanceMeters(sender: DeliveryAddressSnapshot, receiver: DeliveryAddressSnapshot): number {
  return haversineMeters(sender.location, receiver.location);
}

export function computeQuote(input: QuoteInput): Quote {
  const { draft, policy, vehicleModel, vehicles } = input;
  if (!draft.sender || !draft.receiver) throw new Error("缺少地址");

  const distance = routeDistanceMeters(draft.sender, draft.receiver);

  const items: PriceItem[] = [];
  items.push({ type: "base_fee", label: "基础运费", amountFen: policy.baseFeeFen });

  if (distance > policy.includedDistanceMeters) {
    const extra = Math.max(0, distance - policy.includedDistanceMeters);
    const km = Math.ceil(extra / 1000);
    const fee = km * policy.extraDistanceFeeFenPerKm;
    items.push({
      type: "distance_fee",
      label: `里程费（约 ${(distance / 1000).toFixed(1)}km）`,
      amountFen: fee,
    });
  }

  // 货物附加：冷链强制要求
  if (draft.cargo?.category === "fresh_cold_chain" && vehicleModel.supportsColdChain) {
    items.push({ type: "cargo_fee", label: "冷链温控", amountFen: 100 });
  }

  let total = sumPriceItems(items);
  if (total < policy.minimumOrderAmountFen) {
    items.push({
      type: "minimum_adjustment",
      label: "最低收费补足",
      amountFen: policy.minimumOrderAmountFen - total,
    });
    total = policy.minimumOrderAmountFen;
  }
  if (total > policy.maximumOrderAmountFen) {
    // 原型采用返回不可报价，由调用方处理
    throw new Error("价格超出区域允许区间");
  }

  // 候选车辆 ETA 取最近一辆
  const nearestVehicle = pickNearestVehicle(
    vehicles.filter((v) =>
      v.modelId === vehicleModel.id && v.enabled && v.ownerShared && v.status === "available",
    ),
    draft.sender.location,
  );
  const estimatedArrivalMinutes = nearestVehicle
    ? Math.max(3, Math.round((nearestVehicle.estimatedMinutes ?? 4)))
    : 6;

  const fingerprint = computeInputFingerprint(draft, vehicleModel.id);

  const now = clock.now();
  return {
    id: identity.newId("quote"),
    orderDraftId: draft.id,
    draftRevision: draft.revision,
    inputFingerprint: fingerprint,
    customerId: draft.userId,
    vehicleId: nearestVehicle?.id,
    vehicleModelId: vehicleModel.id,
    pricingPolicyId: policy.id,
    pricingPolicyVersion: policy.version,
    routeDistanceMeters: distance,
    estimatedArrivalMinutes,
    items,
    totalAmountFen: total,
    expiresAt: new Date(now.getTime() + QUOTE_TTL_MS).toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function pickNearestVehicle(vehicles: Vehicle[], from: { latitude: number; longitude: number }) {
  let best: Vehicle | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  let eta = 0;
  for (const v of vehicles) {
    if (!v.location) continue;
    const d = haversineMeters(v.location, from);
    if (d < bestD) {
      bestD = d;
      best = v;
      // 简单 ETA：30km/h 平均速度，分钟
      eta = Math.max(3, Math.round((d / 1000 / 30) * 60));
    }
  }
  return best ? { ...best, estimatedMinutes: eta } : null;
}

export function computeInputFingerprint(
  draft: OrderDraft,
  modelId: string,
): string {
  const sig = {
    rev: draft.revision,
    sender: draft.sender?.location?.latitude?.toFixed(5) + "," + draft.sender?.location?.longitude?.toFixed(5),
    receiver: draft.receiver?.location?.latitude?.toFixed(5) + "," + draft.receiver?.location?.longitude?.toFixed(5),
    mode: draft.serviceTimeMode,
    scheduled: draft.scheduledPickupAt ?? "",
    cargo: draft.cargo
      ? {
          cat: draft.cargo.category,
          q: draft.cargo.quantity,
          w: draft.cargo.unitWeightGrams ?? 0,
          dim: draft.cargo.unitDimensionsMm
            ? `${draft.cargo.unitDimensionsMm.length}x${draft.cargo.unitDimensionsMm.width}x${draft.cargo.unitDimensionsMm.height}`
            : "",
          frag: draft.cargo.fragile,
          handle: draft.cargo.needsHandling,
        }
      : null,
    model: modelId,
  };
  return JSON.stringify(sig);
}

export function quoteIsValidFor(q: Quote, draft: OrderDraft, modelId: string): boolean {
  if (q.vehicleModelId !== modelId) return false;
  if (q.draftRevision !== draft.revision) return false;
  if (q.inputFingerprint !== computeInputFingerprint(draft, modelId)) return false;
  return new Date(q.expiresAt).getTime() > clock.now().getTime();
}
