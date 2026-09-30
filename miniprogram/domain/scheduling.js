"use strict";
/** 调度：评估车辆可调度性，按距离/适配性排序。 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateVehicleForCargo = evaluateVehicleForCargo;
exports.isWithinAvailability = isWithinAvailability;
exports.buildNearbyVehicleView = buildNearbyVehicleView;
exports.pickDispatchedVehicle = pickDispatchedVehicle;
exports.recommendModels = recommendModels;
const geo_1 = require("../adapters/geo");
function evaluateVehicleForCargo(v, model, cargo) {
    var _a;
    const reasons = [];
    if (!v.enabled)
        reasons.push("车辆已停用");
    if (!v.ownerShared)
        reasons.push("车主未开启共享");
    if (!["available"].includes(v.status))
        reasons.push(`车辆状态非可用（${v.status}）`);
    if (!model.supportedCargoCategories.includes((_a = cargo === null || cargo === void 0 ? void 0 : cargo.category) !== null && _a !== void 0 ? _a : "general")) {
        reasons.push("当前车型不支持该货物类型");
    }
    if ((cargo === null || cargo === void 0 ? void 0 : cargo.category) === "fresh_cold_chain" && !model.supportsColdChain) {
        reasons.push("该货物需要冷链车型");
    }
    if (cargo === null || cargo === void 0 ? void 0 : cargo.unitWeightGrams) {
        const totalWeight = cargo.unitWeightGrams * cargo.quantity;
        if (totalWeight > model.maxLoadGrams) {
            reasons.push(`货物总重 ${Math.round(totalWeight / 1000)}kg 超出该车型最大载重`);
        }
    }
    if ((cargo === null || cargo === void 0 ? void 0 : cargo.unitDimensionsMm) &&
        model.cargoBoxDimensionsMm &&
        (cargo.unitDimensionsMm.length > model.cargoBoxDimensionsMm.length ||
            cargo.unitDimensionsMm.width > model.cargoBoxDimensionsMm.width ||
            cargo.unitDimensionsMm.height > model.cargoBoxDimensionsMm.height)) {
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
function isWithinAvailability(rule, at) {
    if (!rule || !rule.enabled)
        return false;
    // ISO weekday: 1 (Mon) ... 7 (Sun)
    const wd = ((at.getDay() + 6) % 7) + 1;
    const minutes = at.getHours() * 60 + at.getMinutes();
    for (const r of rule.ranges) {
        if (!r.weekdays.includes(wd))
            continue;
        const [sh, sm] = r.startTime.split(":").map(Number);
        const [eh, em] = r.endTime.split(":").map(Number);
        if (minutes >= sh * 60 + sm && minutes < eh * 60 + em)
            return true;
    }
    return false;
}
function buildNearbyVehicleView(v, model, userLocation, rule, recommended, tags) {
    var _a, _b, _c, _d;
    const distance = v.location ? (0, geo_1.haversineMeters)(v.location, userLocation) : 9999;
    const etaMin = Math.max(3, Math.round((distance / 1000 / 30) * 60));
    return {
        vehicleId: v.id,
        vehicleNo: v.vehicleNo,
        modelId: model.id,
        modelName: model.name,
        modelImage: model.imageUrl,
        category: model.category,
        batteryPercent: (_a = v.batteryPercent) !== null && _a !== void 0 ? _a : 0,
        remainingRangeMeters: (_b = v.remainingRangeMeters) !== null && _b !== void 0 ? _b : 0,
        maxLoadGrams: model.maxLoadGrams,
        cargoVolumeLiters: model.cargoVolumeLiters,
        availableTimeRanges: (_c = rule === null || rule === void 0 ? void 0 : rule.ranges) !== null && _c !== void 0 ? _c : [],
        location: (_d = v.location) !== null && _d !== void 0 ? _d : userLocation,
        distanceToUserMeters: distance,
        estimatedArrivalMinutes: etaMin,
        recommended,
        recommendationTags: tags,
    };
}
/** 调度：按 distanceToPickup 排序，返回最佳车辆；返回 null 表示 NO_CAPACITY */
function pickDispatchedVehicle(vehicles, models, draft, rules, now) {
    if (!draft.sender)
        return null;
    const pickup = draft.sender.location;
    const candidates = vehicles
        .map((v) => {
        if (draft.selectedVehicleModelId && v.modelId !== draft.selectedVehicleModelId)
            return null;
        const m = models.get(v.modelId);
        const rule = rules.get(v.id);
        if (!m)
            return null;
        if (!v.enabled)
            return null;
        if (!v.ownerShared)
            return null;
        if (v.status !== "available")
            return null;
        const startAt = draft.scheduledPickupAt ? new Date(draft.scheduledPickupAt) : now;
        if (!isWithinAvailability(rule, startAt))
            return null;
        const check = evaluateVehicleForCargo(v, m, draft.cargo);
        if (!check.ok)
            return null;
        const distance = v.location ? (0, geo_1.haversineMeters)(v.location, pickup) : Number.POSITIVE_INFINITY;
        return { vehicle: v, model: m, distance };
    })
        .filter(Boolean);
    if (!candidates.length)
        return null;
    candidates.sort((a, b) => a.distance - b.distance || a.vehicle.id.localeCompare(b.vehicle.id));
    return candidates[0];
}
function recommendModels(models, vehicles, draft, userLocation, rules) {
    const now = new Date();
    return models.map((m) => {
        const candidates = vehicles.filter((v) => v.modelId === m.id && v.enabled && v.ownerShared);
        const matched = [];
        const reasons = [];
        for (const v of candidates) {
            const rule = rules.get(v.id);
            const startAt = draft.scheduledPickupAt ? new Date(draft.scheduledPickupAt) : now;
            if (!isWithinAvailability(rule, startAt))
                continue;
            const c = evaluateVehicleForCargo(v, m, draft.cargo);
            if (c.ok)
                matched.push(v);
            else if (reasons.length === 0)
                reasons.push(...c.reasons);
        }
        const distances = matched
            .filter((v) => v.location)
            .map((v) => { var _a, _b; return (0, geo_1.haversineMeters)(v.location, (_b = (_a = draft.sender) === null || _a === void 0 ? void 0 : _a.location) !== null && _b !== void 0 ? _b : userLocation); });
        const minDist = distances.length ? Math.min(...distances) : 9999;
        const eta = Math.max(3, Math.round((minDist / 1000 / 30) * 60));
        const recommended = !!draft.cargo && m.supportedCargoCategories.includes(draft.cargo.category) && matched.length > 0;
        const tags = [];
        if (recommended)
            tags.push("适合当前物品");
        if (m.category === "box_small")
            tags.push("性价比高");
        if (m.category === "box_medium")
            tags.push("空间更大");
        if (m.cargoVolumeLiters >= 4000)
            tags.push("适合大件");
        if (m.supportsColdChain)
            tags.push("温控运输");
        if (m.supportsColdChain)
            tags.push("冷藏保鲜");
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
