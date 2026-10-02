import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import pg from "pg";
import type { CargoInfo, DeliveryAddressSnapshot, DeliveryOrder, OrderStatus, OrderStatusEvent, Payment, Refund, Vehicle, VehicleAvailabilityRule, VehicleModel, VehicleReservation } from "../miniprogram/contracts/types";
import { VEHICLE_CATALOG } from "../miniprogram/content/vehicle-products";

export type AdminLevel = "headquarters" | "province" | "city" | "district";
export interface AdminAccount { id: string; username: string; passwordHash: string; level: AdminLevel; regionId?: string; name: string; }
export interface RegionNode { id: string; name: string; level: "province" | "city" | "district"; parentId?: string; cityId?: string; }
export interface Area { id: string; name: string; regionId: string; cityId: string; center: { latitude: number; longitude: number }; radiusMeters: number; }
export interface OwnerRecord { id: string; userId: string; name: string; }
export interface AuditRecord { id: string; orderId: string; actorId: string; actorName: string; action: string; note: string; at: string; }
export interface Notice { id: string; audienceRegionId: string; orderId: string; title: string; readBy: string[]; at: string; }
export type PriceKey = "baseFeeFen" | "distanceFeeFenPerKm" | "coldChainFeeFen";
export type PriceRange = { min: number; max: number };
export interface RegionalPricing { regionId: string; version: number; ranges: Record<PriceKey, PriceRange>; values?: Record<PriceKey, number>; updatedAt: string; }
export interface PricingChange { id: string; regionId: string; actorId: string; actorName: string; before: RegionalPricing; after: RegionalPricing; at: string; }
export interface VehicleApplication { id: string; ownerId: string; vehicleNo: string; modelId: string; areaId: string; imageUrl: string; status: "pending" | "approved" | "rejected"; reason?: string; reviewedBy?: string; vehicleId?: string; createdAt: string; updatedAt: string; }
export interface SharedState {
  users: Array<{ id: string; openId: string; nickname: string }>;
  admins: AdminAccount[];
  regions: RegionNode[];
  areas: Area[];
  owners: OwnerRecord[];
  models: VehicleModel[];
  vehicles: Vehicle[];
  availability: VehicleAvailabilityRule[];
  reservations: VehicleReservation[];
  orders: DeliveryOrder[];
  events: OrderStatusEvent[];
  payments: Payment[];
  refunds: Refund[];
  audit: AuditRecord[];
  notices: Notice[];
  pricing: Record<string, RegionalPricing>;
  pricingHistory: PricingChange[];
  vehicleApplications: VehicleApplication[];
  requests: Record<string, string>;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const fail = (status: number, code: string, message: string): never => { throw new ApiError(status, code, message); };
export const now = () => new Date().toISOString();
export const id = (prefix: string) => `${prefix}_${randomUUID()}`;
export const hashPassword = (password: string) => {
  const salt = randomUUID();
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};
export const verifyPassword = (password: string, hashed: string) => {
  const [salt, hex] = hashed.split(":");
  if (!salt || !hex) return false;
  const left = scryptSync(password, salt, 64);
  const right = Buffer.from(hex, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
};

const stamp = "2026-10-01T00:00:00.000Z";
const vehicle = (name: string, modelId: string, areaId: string, location: { latitude: number; longitude: number }, ownerId: string): Vehicle => ({
  id: name, vehicleNo: name.toUpperCase(), modelId, ownerId, serviceRegionId: areaId, status: "available",
  location, locationUpdatedAt: stamp, batteryPercent: 80, remainingRangeMeters: 80000,
  imageUrls: [], enabled: true, ownerShared: true, createdAt: stamp, updatedAt: stamp,
});
export function seedState(adminPassword: string, includeDemoAdmins = true): SharedState {
  const regions: RegionNode[] = [
    { id: "jx", name: "江西省", level: "province" },
    { id: "nc", name: "南昌市", level: "city", parentId: "jx", cityId: "nc" },
    { id: "nanchang_county", name: "南昌县", level: "district", parentId: "nc", cityId: "nc" },
    { id: "donghu", name: "东湖区", level: "district", parentId: "nc", cityId: "nc" },
  ];
  const areas: Area[] = [
    { id: "service_yaohu", name: "瑶湖服务区", regionId: "nanchang_county", cityId: "nc", center: { latitude: 28.6829, longitude: 115.8582 }, radiusMeters: 8000 },
    { id: "service_donghu", name: "东湖服务区", regionId: "donghu", cityId: "nc", center: { latitude: 28.6832, longitude: 115.9002 }, radiusMeters: 8000 },
  ];
  const vehicles = [
    vehicle("cly-001", "z2", "service_yaohu", { latitude: 28.6831, longitude: 115.8579 }, "owner_demo"),
    vehicle("cly-002", "z5-2026", "service_yaohu", { latitude: 28.6808, longitude: 115.8611 }, "owner_demo"),
    vehicle("cly-003", "z2", "service_donghu", { latitude: 28.683, longitude: 115.899 }, "owner_donghu"),
    vehicle("cly-004", "z5-c", "service_donghu", { latitude: 28.682, longitude: 115.901 }, "owner_donghu"),
    vehicle("cly-demo-unbound", "z2", "service_yaohu", { latitude: 28.681, longitude: 115.859 }, "owner_demo_unbound"),
  ];
  const availability = vehicles.map((v) => ({ id: `availability_${v.id}`, vehicleId: v.id, timezone: "Asia/Shanghai", ranges: [{ weekdays: [1, 2, 3, 4, 5, 6, 7] as Array<1|2|3|4|5|6|7>, startTime: "00:00" as const, endTime: "23:59" as const }], enabled: true, createdAt: stamp, updatedAt: stamp }));
  const defaults = { baseFeeFen: 500, distanceFeeFenPerKm: 200, coldChainFeeFen: 100 };
  const pricing = Object.fromEntries(["platform", ...regions.map(r => r.id)].map(regionId => [regionId, { regionId, version: 1, ranges: { baseFeeFen: { min: 500, max: 500 }, distanceFeeFenPerKm: { min: 200, max: 200 }, coldChainFeeFen: { min: 100, max: 100 } }, values: regions.find(r => r.id === regionId)?.level === "district" ? { ...defaults } : undefined, updatedAt: stamp }])) as Record<string, RegionalPricing>;
  return {
    users: [], admins: [
      { id: "admin_hq", username: "admin", passwordHash: hashPassword(adminPassword), level: "headquarters", name: "总部管理员" },
      ...(includeDemoAdmins ? [
      { id: "admin_jx", username: "jiangxi", passwordHash: hashPassword(adminPassword), level: "province", regionId: "jx", name: "省级运营" },
      { id: "admin_nc", username: "nanchang", passwordHash: hashPassword(adminPassword), level: "city", regionId: "nc", name: "市级运营" },
      { id: "admin_qh", username: "yaohu", passwordHash: hashPassword(adminPassword), level: "district", regionId: "nanchang_county", name: "取货区运营" },
      { id: "admin_dh", username: "donghu", passwordHash: hashPassword(adminPassword), level: "district", regionId: "donghu", name: "东湖区运营" },
      ] as AdminAccount[] : []),
    ],
    regions, areas, owners: [{ id: "owner_demo", userId: "demo-user", name: "演示车主" }, { id: "owner_donghu", userId: "demo-donghu", name: "东湖车主" }],
    models: VEHICLE_CATALOG.map(item => ({
      id:item.id,code:item.code,name:item.name,category:item.category,imageUrl:item.image,
      description:item.description,maxLoadGrams:item.loadKg*1000,cargoVolumeLiters:item.volumeLiters,
      cargoBoxDimensionsMm:item.dimensions,energyType:"electric" as const,supportsColdChain:item.cold,
      supportedCargoCategories:item.cold?["general","document","fresh_cold_chain","food","medical","other"] as VehicleModel["supportedCargoCategories"]:["general","document","food","medical","other"] as VehicleModel["supportedCargoCategories"],
      enabled:true,createdAt:stamp,updatedAt:stamp,
    })),
    vehicles, availability, reservations: [], orders: [], events: [], payments: [], refunds: [], audit: [], notices: [], pricing, pricingHistory: [], vehicleApplications: [], requests: {},
  };
}

function normalize(state: SharedState, defaults: SharedState) {
  state.pricing ||= structuredClone(defaults.pricing);
  for (const [regionId, policy] of Object.entries(defaults.pricing)) state.pricing[regionId] ||= structuredClone(policy);
  state.pricingHistory ||= [];
  state.vehicleApplications ||= [];
  return state;
}

/** A single locked state row makes related order, vehicle, payment and audit writes atomic. */
export class StateStore {
  private pool?: pg.Pool;
  private memory: SharedState;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(seed: SharedState, databaseUrl?: string) {
    this.memory = seed;
    if (databaseUrl) this.pool = new pg.Pool({ connectionString: databaseUrl, max: 8 });
  }
  async init() {
    if (!this.pool) return;
    await this.pool.query("CREATE TABLE IF NOT EXISTS cly_state (id INTEGER PRIMARY KEY CHECK (id=1), data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())");
    await this.pool.query("INSERT INTO cly_state(id,data) VALUES(1,$1::jsonb) ON CONFLICT(id) DO NOTHING", [JSON.stringify(this.memory)]);
  }
  async read<T>(fn: (state: SharedState) => T): Promise<T> {
    if (!this.pool) return fn(normalize(structuredClone(this.memory), this.memory));
    const result = await this.pool.query("SELECT data FROM cly_state WHERE id=1");
    return fn(normalize(result.rows[0].data as SharedState, this.memory));
  }
  async change<T>(fn: (state: SharedState) => T): Promise<T> {
    if (!this.pool) {
      const work = this.queue.then(() => {
        const copy = normalize(structuredClone(this.memory), this.memory);
        const result = fn(copy);
        this.memory = copy;
        return result;
      });
      this.queue = work.catch(() => undefined);
      return work;
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const row = await client.query("SELECT data FROM cly_state WHERE id=1 FOR UPDATE");
      const state = normalize(row.rows[0].data as SharedState, this.memory);
      const result = fn(state);
      await client.query("UPDATE cly_state SET data=$1::jsonb,updated_at=now() WHERE id=1", [JSON.stringify(state)]);
      await client.query("COMMIT");
      return result;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  async close() { await this.pool?.end(); }
}

export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (v: number) => v * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude), dLon = radians(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}
export function areaFor(state: SharedState, address: DeliveryAddressSnapshot): Area {
  const point = address?.location;
  if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) fail(400, "VALIDATION_ERROR", "地址缺少有效坐标");
  const area = state.areas.filter(a => distanceMeters(a.center, point) <= a.radiusMeters).sort((a,b) => distanceMeters(a.center,point)-distanceMeters(b.center,point))[0];
  return area || fail(400, "OUT_OF_SERVICE", "地址不在当前服务区内");
}
export function visibleRegions(state: SharedState, admin: AdminAccount): Set<string> {
  if (admin.level === "headquarters") return new Set(state.regions.map(r => r.id));
  const result = new Set<string>(admin.regionId ? [admin.regionId] : []);
  let added = true;
  while (added) { added = false; for (const r of state.regions) if (r.parentId && result.has(r.parentId) && !result.has(r.id)) { result.add(r.id); added = true; } }
  return result;
}
export function canSeeOrder(state: SharedState, admin: AdminAccount, order: DeliveryOrder): boolean {
  const scope = visibleRegions(state, admin);
  const pickup = state.areas.find(a => a.id === order.serviceRegionId);
  const destination = order.receiver ? areaFor(state, order.receiver) : undefined;
  return !!pickup && (scope.has(pickup.regionId) || (admin.level === "district" && destination?.regionId === admin.regionId));
}
export function canOperateOrder(state: SharedState, admin: AdminAccount, order: DeliveryOrder): boolean {
  const pickup = state.areas.find(a => a.id === order.serviceRegionId);
  return !!pickup && (admin.level === "headquarters" || (admin.level === "district" && pickup.regionId === admin.regionId) || (admin.level !== "district" && visibleRegions(state, admin).has(pickup.regionId)));
}
export function addEvent(state: SharedState, order: DeliveryOrder, toStatus: OrderStatus, actorType: OrderStatusEvent["actorType"], actorId: string, note: string) {
  const fromStatus = order.status;
  order.status = toStatus; order.updatedAt = now();
  if (toStatus === "completed") order.actualDeliveryAt = order.updatedAt;
  if (toStatus === "delivering") order.actualPickupAt = order.updatedAt;
  state.events.push({ id: id("event"), orderId: order.id, fromStatus, toStatus, actorType, actorId, occurredAt: order.updatedAt, note, createdAt: order.updatedAt, updatedAt: order.updatedAt });
}
export function audit(state: SharedState, order: DeliveryOrder, admin: AdminAccount, action: string, note: string) {
  state.audit.push({ id: id("audit"), orderId: order.id, actorId: admin.id, actorName: admin.name, action, note, at: now() });
}
export function notify(state: SharedState, order: DeliveryOrder, title: string) {
  const area = state.areas.find(a => a.id === order.serviceRegionId);
  if (area) state.notices.push({ id: id("notice"), audienceRegionId: area.regionId, orderId: order.id, title, readBy: [], at: now() });
}
export function getOrder(state: SharedState, orderId: string) { return state.orders.find(o => o.id === orderId) || fail(404, "NOT_FOUND", "订单不存在"); }
export function priceFor(sender: DeliveryAddressSnapshot, receiver: DeliveryAddressSnapshot, cargo: CargoInfo, model: VehicleModel, rates: Record<PriceKey, number> = { baseFeeFen: 500, distanceFeeFenPerKm: 200, coldChainFeeFen: 100 }) {
  const distance = distanceMeters(sender.location, receiver.location);
  const items: DeliveryOrder["priceItems"] = [{ type: "base_fee", label: "基础运费", amountFen: rates.baseFeeFen }];
  if (distance > 0) items.push({ type: "distance_fee", label: `里程费（约 ${(distance/1000).toFixed(1)}km）`, amountFen: Math.ceil(distance / 1000) * rates.distanceFeeFenPerKm });
  if (cargo.category === "fresh_cold_chain" && model.supportsColdChain) items.push({ type: "cargo_fee", label: "冷链温控", amountFen: rates.coldChainFeeFen });
  return { items, total: items.reduce((sum, item) => sum + item.amountFen, 0) };
}
