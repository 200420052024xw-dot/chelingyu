/** 首页专用演示运力。与真实订单匹配和车主车辆数据隔离。 */
import type { GeoPoint } from "../contracts/types";
import { VEHICLE_CATALOG } from "../content/vehicle-products";

export interface HomeDemoVehicle {
  id: string;
  markerId: number;
  modelId: string;
  modelCode: string;
  modelName: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  locationText: string;
  status: string;
  etaMinutes: number;
  batteryPercent: number;
}

export interface HomeDemoSnapshot {
  anchor: GeoPoint;
  anchorLabel: string;
  vehicles: HomeDemoVehicle[];
}

let snapshot: HomeDemoSnapshot | null = null;
let generation = 0;
const DIRECTIONS = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];

function directionFor(angle: number): string {
  return DIRECTIONS[Math.round(angle / (Math.PI / 4)) % DIRECTIONS.length];
}

export const homeDemoFleet = {
  regenerate(anchor: GeoPoint, anchorLabel: string, random: () => number = Math.random): HomeDemoSnapshot {
    let count = 2 + Math.floor(random() * 5);
    if (snapshot && count === snapshot.vehicles.length) count = count === 6 ? 2 : count + 1;
    generation += 1;
    const vehicles: HomeDemoVehicle[] = Array.from({ length: count }, (_, index) => {
      const model = VEHICLE_CATALOG[Math.floor(random() * VEHICLE_CATALOG.length)];
      const distanceMeters = 200 + Math.round(random() * 900);
      const angle = random() * Math.PI * 2;
      const northMeters = Math.cos(angle) * distanceMeters;
      const eastMeters = Math.sin(angle) * distanceMeters;
      const latitude = anchor.latitude + northMeters / 111320;
      const longitude = anchor.longitude + eastMeters / (111320 * Math.max(0.2, Math.cos(anchor.latitude * Math.PI / 180)));
      return {
        id: `demo-${generation}-${index + 1}`,
        markerId: index + 1,
        modelId: model.id,
        modelCode: model.code,
        modelName: model.name,
        latitude,
        longitude,
        distanceMeters,
        locationText: `${directionFor(angle)}侧约 ${distanceMeters} 米`,
        status: random() < 0.75 ? "可立即接单" : "附近待命中",
        etaMinutes: 3 + Math.ceil(distanceMeters / 300),
        batteryPercent: 55 + Math.floor(random() * 44),
      };
    });
    snapshot = { anchor, anchorLabel, vehicles };
    return snapshot;
  },

  getSnapshot(): HomeDemoSnapshot | null { return snapshot; },

  relocate(anchor: GeoPoint, anchorLabel: string): HomeDemoSnapshot {
    if (!snapshot) return this.regenerate(anchor, anchorLabel);
    const oldAnchor = snapshot.anchor;
    const oldCos = Math.max(0.2, Math.cos(oldAnchor.latitude * Math.PI / 180));
    const newCos = Math.max(0.2, Math.cos(anchor.latitude * Math.PI / 180));
    const vehicles = snapshot.vehicles.map((vehicle) => {
      const northMeters = (vehicle.latitude - oldAnchor.latitude) * 111320;
      const eastMeters = (vehicle.longitude - oldAnchor.longitude) * 111320 * oldCos;
      return {
        ...vehicle,
        latitude: anchor.latitude + northMeters / 111320,
        longitude: anchor.longitude + eastMeters / (111320 * newCos),
      };
    });
    snapshot = { anchor, anchorLabel, vehicles };
    return snapshot;
  },

  getVehicle(id: string): HomeDemoVehicle | null {
    return snapshot?.vehicles.find((vehicle) => vehicle.id === id) ?? null;
  },

  setAnchorLabel(anchorLabel: string): void {
    if (snapshot) snapshot = { ...snapshot, anchorLabel };
  },
};
