/** 通用仓库方法：避免服务层直接操作底层集合 */

import type {
  Address,
  DeliveryOrder,
  DispatchRecord,
  ID,
  Notification,
  OrderDraft,
  OrderStatusEvent,
  Payment,
  Quote,
  Refund,
  Region,
  RevenueAllocation,
  ServiceArea,
  SupportTicket,
  User,
  Vehicle,
  VehicleAvailabilityRule,
  VehicleModel,
  VehicleOwner,
  VehicleReservation,
  PricingPolicy,
  RevenueSharingRule,
} from "../contracts/types";
import { commitDB, getDB } from "./local-database";

export const repo = {
  // ---- 用户/地址/区域 ----
  listUsers(): User[] {
    return [...getDB().users];
  },
  getUser(id: ID): User | undefined {
    return getDB().users.find((u) => u.id === id);
  },
  listAddresses(userId: ID): Address[] {
    return getDB().addresses.filter((a) => a.userId === userId);
  },
  upsertAddress(a: Address): void {
    const db = getDB();
    const idx = db.addresses.findIndex((x) => x.id === a.id);
    if (idx >= 0) db.addresses[idx] = a;
    else db.addresses.push(a);
    commitDB();
  },
  removeAddress(id: ID): void {
    const db = getDB();
    db.addresses = db.addresses.filter((x) => x.id !== id);
    commitDB();
  },

  listRegions(): Region[] {
    return [...getDB().regions];
  },
  listServiceAreas(): ServiceArea[] {
    return [...getDB().serviceAreas];
  },
  getServiceArea(id: ID): ServiceArea | undefined {
    return getDB().serviceAreas.find((a) => a.id === id);
  },

  // ---- 车辆 ----
  listVehicleModels(): VehicleModel[] {
    return [...getDB().vehicleModels];
  },
  getVehicleModel(id: ID): VehicleModel | undefined {
    return getDB().vehicleModels.find((m) => m.id === id);
  },
  upsertVehicleModel(model: VehicleModel): void {
    const db = getDB();
    const index = db.vehicleModels.findIndex(m => m.id === model.id);
    if (index >= 0) db.vehicleModels[index] = model;
    else db.vehicleModels.push(model);
    commitDB();
  },
  listVehicles(): Vehicle[] {
    return [...getDB().vehicles];
  },
  getVehicle(id: ID): Vehicle | undefined {
    return getDB().vehicles.find((v) => v.id === id);
  },
  listVehiclesByOwner(ownerId: ID): Vehicle[] {
    return getDB().vehicles.filter((v) => v.ownerId === ownerId);
  },
  upsertVehicle(v: Vehicle): void {
    const db = getDB();
    const idx = db.vehicles.findIndex((x) => x.id === v.id);
    if (idx >= 0) db.vehicles[idx] = v;
    else db.vehicles.push(v);
    commitDB();
  },

  listAvailabilityRules(): VehicleAvailabilityRule[] {
    return [...getDB().availabilityRules];
  },
  getAvailabilityRule(vehicleId: ID): VehicleAvailabilityRule | undefined {
    return getDB().availabilityRules.find((r) => r.vehicleId === vehicleId);
  },
  upsertAvailabilityRule(r: VehicleAvailabilityRule): void {
    const db = getDB();
    const idx = db.availabilityRules.findIndex((x) => x.id === r.id);
    if (idx >= 0) db.availabilityRules[idx] = r;
    else db.availabilityRules.push(r);
    commitDB();
  },

  listReservations(): VehicleReservation[] {
    return [...getDB().reservations];
  },
  upsertReservation(r: VehicleReservation): void {
    const db = getDB();
    const idx = db.reservations.findIndex((x) => x.id === r.id);
    if (idx >= 0) db.reservations[idx] = r;
    else db.reservations.push(r);
    commitDB();
  },

  // ---- 草稿/报价/订单 ----
  listDrafts(): OrderDraft[] {
    return [...getDB().drafts];
  },
  getDraft(id: ID): OrderDraft | undefined {
    return getDB().drafts.find((d) => d.id === id);
  },
  upsertDraft(d: OrderDraft): void {
    const db = getDB();
    const idx = db.drafts.findIndex((x) => x.id === d.id);
    if (idx >= 0) db.drafts[idx] = d;
    else db.drafts.push(d);
    commitDB();
  },
  removeDraft(id: ID): void {
    const db = getDB();
    db.drafts = db.drafts.filter((d) => d.id !== id);
    commitDB();
  },

  listQuotes(): Quote[] {
    return [...getDB().quotes];
  },
  getQuote(id: ID): Quote | undefined {
    return getDB().quotes.find((q) => q.id === id);
  },
  upsertQuote(q: Quote): void {
    const db = getDB();
    const idx = db.quotes.findIndex((x) => x.id === q.id);
    if (idx >= 0) db.quotes[idx] = q;
    else db.quotes.push(q);
    commitDB();
  },

  listOrders(): DeliveryOrder[] {
    return [...getDB().orders];
  },
  getOrder(id: ID): DeliveryOrder | undefined {
    return getDB().orders.find((o) => o.id === id);
  },
  upsertOrder(o: DeliveryOrder): void {
    const db = getDB();
    const idx = db.orders.findIndex((x) => x.id === o.id);
    if (idx >= 0) db.orders[idx] = o;
    else db.orders.push(o);
    commitDB();
  },

  listOrderEvents(orderId: ID): OrderStatusEvent[] {
    return getDB().orderEvents.filter((e) => e.orderId === orderId).sort((a, b) =>
      a.occurredAt.localeCompare(b.occurredAt),
    );
  },
  appendOrderEvent(e: OrderStatusEvent): void {
    getDB().orderEvents.push(e);
    commitDB();
  },

  listDispatchRecords(): DispatchRecord[] {
    return [...(getDB() as any).dispatchRecords ?? []];
  },
  upsertDispatchRecord(d: DispatchRecord): void {
    const db = getDB() as any;
    if (!db.dispatchRecords) db.dispatchRecords = [];
    const idx = db.dispatchRecords.findIndex((x: DispatchRecord) => x.id === d.id);
    if (idx >= 0) db.dispatchRecords[idx] = d;
    else db.dispatchRecords.push(d);
    commitDB();
  },

  // ---- 价格/分润 ----
  listPricingPolicies(): PricingPolicy[] {
    return [...getDB().pricingPolicies];
  },
  getPricingPolicy(id: ID): PricingPolicy | undefined {
    return getDB().pricingPolicies.find((p) => p.id === id);
  },
  getDefaultPricingPolicy(): PricingPolicy | undefined {
    return getDB().pricingPolicies.find((p) => p.enabled);
  },

  listRevenueSharingRules(): RevenueSharingRule[] {
    return [...getDB().revenueSharingRules];
  },
  getDefaultSharingRule(): RevenueSharingRule | undefined {
    return getDB().revenueSharingRules.find((r) => r.enabled);
  },

  // ---- 支付/退款 ----
  listPayments(): Payment[] {
    return [...getDB().payments];
  },
  upsertPayment(p: Payment): void {
    const db = getDB();
    const idx = db.payments.findIndex((x) => x.id === p.id);
    if (idx >= 0) db.payments[idx] = p;
    else db.payments.push(p);
    commitDB();
  },

  listRefunds(): Refund[] {
    return [...getDB().refunds];
  },
  upsertRefund(r: Refund): void {
    const db = getDB();
    const idx = db.refunds.findIndex((x) => x.id === r.id);
    if (idx >= 0) db.refunds[idx] = r;
    else db.refunds.push(r);
    commitDB();
  },

  listAllocations(): RevenueAllocation[] {
    return [...getDB().revenueAllocations];
  },
  upsertAllocation(a: RevenueAllocation): void {
    const db = getDB();
    const idx = db.revenueAllocations.findIndex((x) => x.id === a.id);
    if (idx >= 0) db.revenueAllocations[idx] = a;
    else db.revenueAllocations.push(a);
    commitDB();
  },

  // ---- 通知/工单 ----
  listNotifications(userId: ID): Notification[] {
    return getDB().notifications.filter((n) => n.userId === userId);
  },
  upsertNotification(n: Notification): void {
    const db = getDB();
    const idx = db.notifications.findIndex((x) => x.id === n.id);
    if (idx >= 0) db.notifications[idx] = n;
    else db.notifications.push(n);
    commitDB();
  },

  listSupportTickets(userId?: ID): SupportTicket[] {
    const all = getDB().supportTickets;
    return userId ? all.filter((t) => t.creatorUserId === userId) : [...all];
  },
  upsertSupportTicket(t: SupportTicket): void {
    const db = getDB();
    const idx = db.supportTickets.findIndex((x) => x.id === t.id);
    if (idx >= 0) db.supportTickets[idx] = t;
    else db.supportTickets.push(t);
    commitDB();
  },

  listVehicleOwners(): VehicleOwner[] {
    return [...getDB().vehicleOwners];
  },
  getVehicleOwnerByUser(userId: ID): VehicleOwner | undefined {
    return getDB().vehicleOwners.find((o) => o.userId === userId);
  },
};
