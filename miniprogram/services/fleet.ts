/** Fleet Service */

import type {
  GeoPoint,
  ID,
  ModelOfferView,
  NearbyVehicleView,
  OrderDraft,
  Vehicle,
  VehicleModel,
} from "../contracts/types";
import { repo } from "../repositories/index";
import {
  buildNearbyVehicleView,
  evaluateModelForCargo,
  recommendModels,
} from "../domain/scheduling";
import { sessionStore } from "../stores/session";
import { locationAdapter } from "../adapters/location";

export const fleetService = {
  nearby(input: { userLocation?: GeoPoint; areaId?: ID }): NearbyVehicleView[] {
    const userLoc = input.userLocation || locationAdapter.getUserLocation();
    const rules = new Map(repo.listAvailabilityRules().map((r) => [r.vehicleId, r]));
    const models = new Map(repo.listVehicleModels().map((m) => [m.id, m]));
    const userId = sessionStore.getCurrentUserId();
    const ownerId = sessionStore.getCurrentOwnerId();
    const owner = repo.getVehicleOwnerByUser(userId);
    const ownedVehicleIds = new Set(
      owner ? repo.listVehiclesByOwner(owner.id).map((v) => v.id) : [],
    );

    return repo
      .listVehicles()
      .filter((v) => v.enabled)
      .map((v) => {
        const m = models.get(v.modelId);
        const rule = rules.get(v.id);
        if (!m) return null;
        const recommended = v.ownerShared && v.status === "available";
        const tags: string[] = [];
        if (recommended) tags.push("可用");
        if (ownedVehicleIds.has(v.id)) tags.push("我的车辆");
        if (m.category === "box_small") tags.push("性价比高");
        if (m.category === "box_medium") tags.push("空间更大");
        if (m.supportsColdChain) tags.push("温控运输");
        if (v.batteryPercent !== undefined && v.batteryPercent < 25) tags.push("电量偏低");
        return buildNearbyVehicleView(v, m, userLoc, rule, recommended, tags);
      })
      .filter(Boolean) as NearbyVehicleView[];
  },

  getPublicVehicle(id: ID): NearbyVehicleView | null {
    const v = repo.getVehicle(id);
    if (!v) return null;
    const m = repo.getVehicleModel(v.modelId);
    if (!m) return null;
    const rule = repo.getAvailabilityRule(v.id);
    return buildNearbyVehicleView(v, m, locationAdapter.getUserLocation(), rule, true, []);
  },

  recommend(input: { draft: OrderDraft; userLocation?: GeoPoint }): ModelOfferView[] {
    const models = repo.listVehicleModels();
    const vehicles = repo.listVehicles();
    const rules = new Map(repo.listAvailabilityRules().map((r) => [r.vehicleId, r]));
    const userLoc = input.userLocation || locationAdapter.getUserLocation();

    const recs = recommendModels(models, vehicles, input.draft, userLoc, rules);
    return recs.map((r) => {
      const model = r.model;
      const reasons = evaluateModelForCargo(model, input.draft.cargo).reasons;
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
      cargoBoxDimensionsMm: r.model.cargoBoxDimensionsMm?.length ? r.model.cargoBoxDimensionsMm : undefined,
      availableCount: r.availableCount,
      distanceMeters: r.nearestDistance === 9999 ? 0 : r.nearestDistance,
      estimatedArrivalMinutes: r.available ? r.etaMinutes : 0,
      batteryPercent: supplySource === "nearby" ? vehicles.find((vehicle) => vehicle.id === r.nearestVehicleId)?.batteryPercent : undefined,
      recommended: r.recommended || compatible,
      available: r.available || compatible,
      unavailableReasons: compatible ? [] : (reasons.length ? reasons : r.unavailableReasons),
      tags: r.tags.filter((tag) => tag !== "适合当前物品"),
      supplySource,
    });
    });
  },
};
