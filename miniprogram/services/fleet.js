"use strict";
/** Fleet Service */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fleetService = void 0;
const index_1 = require("../repositories/index");
const scheduling_1 = require("../domain/scheduling");
const session_1 = require("../stores/session");
const location_1 = require("../adapters/location");
exports.fleetService = {
    nearby(input) {
        const userLoc = input.userLocation || location_1.locationAdapter.getUserLocation();
        const rules = new Map(index_1.repo.listAvailabilityRules().map((r) => [r.vehicleId, r]));
        const models = new Map(index_1.repo.listVehicleModels().map((m) => [m.id, m]));
        const userId = session_1.sessionStore.getCurrentUserId();
        const ownerId = session_1.sessionStore.getCurrentOwnerId();
        const owner = index_1.repo.getVehicleOwnerByUser(userId);
        const ownedVehicleIds = new Set(owner ? index_1.repo.listVehiclesByOwner(owner.id).map((v) => v.id) : []);
        return index_1.repo
            .listVehicles()
            .filter((v) => v.enabled)
            .map((v) => {
            const m = models.get(v.modelId);
            const rule = rules.get(v.id);
            if (!m)
                return null;
            const recommended = v.ownerShared && v.status === "available";
            const tags = [];
            if (recommended)
                tags.push("可用");
            if (ownedVehicleIds.has(v.id))
                tags.push("我的车辆");
            if (m.category === "box_small")
                tags.push("性价比高");
            if (m.category === "box_medium")
                tags.push("空间更大");
            if (m.supportsColdChain)
                tags.push("温控运输");
            if (v.batteryPercent !== undefined && v.batteryPercent < 25)
                tags.push("电量偏低");
            return (0, scheduling_1.buildNearbyVehicleView)(v, m, userLoc, rule, recommended, tags);
        })
            .filter(Boolean);
    },
    getPublicVehicle(id) {
        const v = index_1.repo.getVehicle(id);
        if (!v)
            return null;
        const m = index_1.repo.getVehicleModel(v.modelId);
        if (!m)
            return null;
        const rule = index_1.repo.getAvailabilityRule(v.id);
        return (0, scheduling_1.buildNearbyVehicleView)(v, m, location_1.locationAdapter.getUserLocation(), rule, true, []);
    },
    recommend(input) {
        const models = index_1.repo.listVehicleModels();
        const vehicles = index_1.repo.listVehicles();
        const rules = new Map(index_1.repo.listAvailabilityRules().map((r) => [r.vehicleId, r]));
        const userLoc = input.userLocation || location_1.locationAdapter.getUserLocation();
        const recs = (0, scheduling_1.recommendModels)(models, vehicles, input.draft, userLoc, rules);
        return recs.map((r) => {
            var _a, _b;
            const model = r.model;
            const reasons = (0, scheduling_1.evaluateModelForCargo)(model, input.draft.cargo).reasons;
            const compatible = reasons.length === 0;
            const supplySource = input.draft.serviceTimeMode === "scheduled" || !compatible || !r.available || !r.nearestVehicleId
                ? "headquarters" : "nearby";
            return ({
                modelId: r.model.id,
                modelName: r.model.name,
                modelImage: r.model.imageUrl,
                category: r.model.category,
                maxLoadGrams: r.model.maxLoadGrams,
                cargoVolumeLiters: r.model.cargoVolumeLiters,
                cargoBoxDimensionsMm: ((_a = r.model.cargoBoxDimensionsMm) === null || _a === void 0 ? void 0 : _a.length) ? r.model.cargoBoxDimensionsMm : undefined,
                availableCount: r.availableCount,
                distanceMeters: r.nearestDistance === 9999 ? 0 : r.nearestDistance,
                estimatedArrivalMinutes: r.available ? r.etaMinutes : 0,
                batteryPercent: supplySource === "nearby" ? (_b = vehicles.find((vehicle) => vehicle.id === r.nearestVehicleId)) === null || _b === void 0 ? void 0 : _b.batteryPercent : undefined,
                recommended: r.recommended || compatible,
                available: r.available || compatible,
                unavailableReasons: compatible ? [] : (reasons.length ? reasons : r.unavailableReasons),
                tags: r.tags.filter((tag) => tag !== "适合当前物品"),
                supplySource,
            });
        });
    },
};
