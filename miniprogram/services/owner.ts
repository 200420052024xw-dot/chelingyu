/** Owner Service */

import type {
  DeliveryAddressSnapshot,
  DeliveryOrder,
  EarningsView,
  ID,
  OrderStatus,
  OrderStatusEvent,
  OwnerTaskView,
  Vehicle,
  VehicleAvailabilityRule,
  WeeklyTimeRange,
} from "../contracts/types";
import { repo } from "../repositories/index";
import { sessionStore } from "../stores/session";
import { clock } from "../adapters/clock";
import { identity } from "../adapters/identity";
import { OrderError } from "./order";

function statusBadge(status: OrderStatus): OwnerTaskView["statusBadge"] {
  switch (status) {
    case "pending_payment": return { text: "待支付", tone: "warning" };
    case "paid": return { text: "待匹配", tone: "info" };
    case "scheduled": return { text: "已预约", tone: "info" };
    case "matching": return { text: "匹配中", tone: "info" };
    case "dispatched": return { text: "已派车", tone: "info" };
    case "vehicle_to_pickup": return { text: "前往取件", tone: "info" };
    case "awaiting_loading": return { text: "等待装货", tone: "warning" };
    case "delivering": return { text: "配送中", tone: "info" };
    case "arrived": return { text: "待确认收货", tone: "warning" };
    case "completed": return { text: "已完成", tone: "success" };
    case "cancelled": return { text: "已取消", tone: "neutral" };
    case "failed": return { text: "失败", tone: "danger" };
    default: return { text: status, tone: "neutral" };
  }
}

export const ownerService = {
  listVehicles(): Vehicle[] {
    const owner = repo.getVehicleOwnerByUser(sessionStore.getCurrentUserId());
    if (!owner) return [];
    return repo.listVehiclesByOwner(owner.id);
  },

  listAvailableDemoVehicles(): Vehicle[] {
    return repo.listVehicles().filter((v) => v.ownerId === "owner_demo_unbound");
  },

  bindDemoVehicle(input: { vehicleId: ID }): Vehicle {
    const v = repo.getVehicle(input.vehicleId);
    if (!v) throw new OrderError("NOT_FOUND", "车辆不存在");
    const owner = repo.getVehicleOwnerByUser(sessionStore.getCurrentUserId());
    if (!owner) throw new OrderError("FORBIDDEN", "当前用户无车主身份");
    if (v.ownerId === owner.id) return v;
    if (v.ownerId !== "owner_demo_unbound") throw new OrderError("FORBIDDEN", "该车辆不在可绑定演示池");
    const updated: Vehicle = { ...v, ownerId: owner.id, updatedAt: clock.nowIso() };
    repo.upsertVehicle(updated);
    // 同步初始化开放规则
    const rule = repo.getAvailabilityRule(v.id);
    if (!rule) {
      const r: VehicleAvailabilityRule = {
        id: identity.newId("availability"),
        vehicleId: v.id,
        timezone: "Asia/Shanghai",
        ranges: [
          { weekdays: [1, 2, 3, 4, 5, 6, 7], startTime: "08:00", endTime: "22:00" },
        ],
        enabled: true,
        createdAt: clock.nowIso(),
        updatedAt: clock.nowIso(),
      };
      repo.upsertAvailabilityRule(r);
    }
    return updated;
  },

  vehicleDetail(id: ID) {
    const v = repo.getVehicle(id);
    if (!v) throw new OrderError("NOT_FOUND", "车辆不存在");
    this.assertOwned(v);
    const rule = repo.getAvailabilityRule(v.id);
    const model = repo.getVehicleModel(v.modelId);
    const tasks = this.tasksForVehicle(v.id).items;
    return { vehicle: v, rule, model, tasks };
  },

  saveAvailability(input: { vehicleId: ID; ranges: WeeklyTimeRange[]; enabled: boolean; ownerShared: boolean }): VehicleAvailabilityRule {
    const v = repo.getVehicle(input.vehicleId);
    if (!v) throw new OrderError("NOT_FOUND", "车辆不存在");
    this.assertOwned(v);
    // 校验：已承诺预约不允许破坏
    const reservations = repo.listReservations().filter((r) => r.vehicleId === v.id && r.status === "scheduled");
    if (reservations.length && !input.enabled) {
      // 关闭共享时不影响已承诺预约
    }
    const now = clock.nowIso();
    const updated: Vehicle = { ...v, ownerShared: input.ownerShared, updatedAt: now };
    repo.upsertVehicle(updated);

    const rule: VehicleAvailabilityRule = {
      id: repo.getAvailabilityRule(v.id)?.id ?? identity.newId("availability"),
      vehicleId: v.id,
      timezone: "Asia/Shanghai",
      ranges: input.ranges,
      enabled: input.enabled,
      createdAt: repo.getAvailabilityRule(v.id)?.createdAt ?? now,
      updatedAt: now,
    };
    repo.upsertAvailabilityRule(rule);
    return rule;
  },

  tasksForVehicle(vehicleId: ID): { items: OwnerTaskView[]; total: number } {
    const vehicle = repo.getVehicle(vehicleId);
    if (!vehicle) throw new OrderError("NOT_FOUND", "车辆不存在");
    this.assertOwned(vehicle);
    const orders = repo
      .listOrders()
      .filter((o) => o.assignedVehicleId === vehicleId);
    const items: OwnerTaskView[] = orders.map((o) => ({
      orderId: o.id,
      orderNo: o.orderNo,
      status: o.status,
      statusBadge: statusBadge(o.status),
      pickup: this.maskAddress(o.sender),
      dropoff: this.maskAddress(o.receiver),
      scheduledAt: o.scheduledPickupAt,
      estimatedPickupAt: o.estimatedPickupAt,
      estimatedDeliveryAt: o.estimatedDeliveryAt,
      vehicleNo: repo.getVehicle(o.assignedVehicleId!)?.vehicleNo ?? "",
    }));
    items.sort((a, b) => (a.estimatedPickupAt || "").localeCompare(b.estimatedPickupAt || ""));
    return { items, total: items.length };
  },

  earnings(): EarningsView {
    const ownerId = sessionStore.getCurrentOwnerId();
    const alloc = repo.listAllocations().filter((a) => {
      if (a.recipientType !== "vehicle_owner") return false;
      return a.recipientId === ownerId;
    });
    const pending = alloc.filter((a) => a.status !== "settled").reduce((s, a) => s + a.amountFen, 0);
    const settled = alloc.filter((a) => a.status === "settled").reduce((s, a) => s + a.amountFen, 0);
    const orderIds = new Set(alloc.map((a) => a.orderId));
    const orderMap = new Map<string, DeliveryOrder>();
    for (const id of orderIds) {
      const o = repo.getOrder(id);
      if (o) orderMap.set(id, o);
    }
    const items = alloc.map((a) => {
      const o = orderMap.get(a.orderId);
      return {
        id: a.id,
        orderNo: o?.orderNo ?? "—",
        vehicleNo: o?.assignedVehicleId ? repo.getVehicle(o.assignedVehicleId)?.vehicleNo ?? "" : "",
        createdAt: o?.createdAt ?? a.createdAt,
        settledAt: a.settledAt,
        amountFen: a.amountFen,
        status: a.status,
      };
    });
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { pendingFen: pending, settledFen: settled, totalFen: pending + settled, items };
  },

  /** 脱敏：仅显示地址 + 收件人首字 */
  maskAddress(snap: DeliveryAddressSnapshot): DeliveryAddressSnapshot {
    const maskedMobile = snap.contactMobile
      ? snap.contactMobile.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")
      : "";
    const maskedName = snap.contactName ? `${snap.contactName.charAt(0)}**` : "";
    return { ...snap, contactName: maskedName, contactMobile: maskedMobile };
  },

  assertOwned(vehicle: Vehicle): void {
    const owner = repo.getVehicleOwnerByUser(sessionStore.getCurrentUserId());
    if (!owner || vehicle.ownerId !== owner.id) throw new OrderError("FORBIDDEN", "无权查看或管理该车辆");
  },
};
