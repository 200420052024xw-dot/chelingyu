"use strict";
/** 计价：生成报价（不可变快照）。 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeDistanceMeters = routeDistanceMeters;
exports.computeQuote = computeQuote;
exports.computeInputFingerprint = computeInputFingerprint;
exports.quoteIsValidFor = quoteIsValidFor;
const geo_1 = require("../adapters/geo");
const clock_1 = require("../adapters/clock");
const identity_1 = require("../adapters/identity");
const validators_1 = require("./validators");
const QUOTE_TTL_MS = 5 * 60 * 1000; // 5 分钟有效
function routeDistanceMeters(sender, receiver) {
    return (0, geo_1.haversineMeters)(sender.location, receiver.location);
}
function computeQuote(input) {
    var _a, _b;
    const { draft, policy, vehicleModel, vehicles } = input;
    if (!draft.sender || !draft.receiver)
        throw new Error("缺少地址");
    const distance = routeDistanceMeters(draft.sender, draft.receiver);
    const items = [];
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
    if (((_a = draft.cargo) === null || _a === void 0 ? void 0 : _a.category) === "fresh_cold_chain" && vehicleModel.supportsColdChain) {
        items.push({ type: "cargo_fee", label: "冷链温控", amountFen: 100 });
    }
    let total = (0, validators_1.sumPriceItems)(items);
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
    const nearestVehicle = pickNearestVehicle(vehicles.filter((v) => v.modelId === vehicleModel.id && v.enabled && v.ownerShared && v.status === "available"), draft.sender.location);
    const estimatedArrivalMinutes = nearestVehicle
        ? Math.max(3, Math.round(((_b = nearestVehicle.estimatedMinutes) !== null && _b !== void 0 ? _b : 4)))
        : 6;
    const fingerprint = computeInputFingerprint(draft, vehicleModel.id);
    const now = clock_1.clock.now();
    return {
        id: identity_1.identity.newId("quote"),
        orderDraftId: draft.id,
        draftRevision: draft.revision,
        inputFingerprint: fingerprint,
        customerId: draft.userId,
        vehicleId: nearestVehicle === null || nearestVehicle === void 0 ? void 0 : nearestVehicle.id,
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
function pickNearestVehicle(vehicles, from) {
    let best = null;
    let bestD = Number.POSITIVE_INFINITY;
    let eta = 0;
    for (const v of vehicles) {
        if (!v.location)
            continue;
        const d = (0, geo_1.haversineMeters)(v.location, from);
        if (d < bestD) {
            bestD = d;
            best = v;
            // 简单 ETA：30km/h 平均速度，分钟
            eta = Math.max(3, Math.round((d / 1000 / 30) * 60));
        }
    }
    return best ? Object.assign(Object.assign({}, best), { estimatedMinutes: eta }) : null;
}
function computeInputFingerprint(draft, modelId) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const sig = {
        rev: draft.revision,
        sender: ((_c = (_b = (_a = draft.sender) === null || _a === void 0 ? void 0 : _a.location) === null || _b === void 0 ? void 0 : _b.latitude) === null || _c === void 0 ? void 0 : _c.toFixed(5)) + "," + ((_f = (_e = (_d = draft.sender) === null || _d === void 0 ? void 0 : _d.location) === null || _e === void 0 ? void 0 : _e.longitude) === null || _f === void 0 ? void 0 : _f.toFixed(5)),
        receiver: ((_j = (_h = (_g = draft.receiver) === null || _g === void 0 ? void 0 : _g.location) === null || _h === void 0 ? void 0 : _h.latitude) === null || _j === void 0 ? void 0 : _j.toFixed(5)) + "," + ((_m = (_l = (_k = draft.receiver) === null || _k === void 0 ? void 0 : _k.location) === null || _l === void 0 ? void 0 : _l.longitude) === null || _m === void 0 ? void 0 : _m.toFixed(5)),
        mode: draft.serviceTimeMode,
        scheduled: (_o = draft.scheduledPickupAt) !== null && _o !== void 0 ? _o : "",
        cargo: draft.cargo
            ? {
                cat: draft.cargo.category,
                q: draft.cargo.quantity,
                w: (_p = draft.cargo.unitWeightGrams) !== null && _p !== void 0 ? _p : 0,
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
function quoteIsValidFor(q, draft, modelId) {
    if (q.vehicleModelId !== modelId)
        return false;
    if (q.draftRevision !== draft.revision)
        return false;
    if (q.inputFingerprint !== computeInputFingerprint(draft, modelId))
        return false;
    return new Date(q.expiresAt).getTime() > clock_1.clock.now().getTime();
}
