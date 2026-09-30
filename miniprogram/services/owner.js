"use strict";
/** Owner Service */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ownerService = void 0;
const index_1 = require("../repositories/index");
const session_1 = require("../stores/session");
const clock_1 = require("../adapters/clock");
const identity_1 = require("../adapters/identity");
const order_1 = require("./order");
function statusBadge(status) {
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
exports.ownerService = {
    listVehicles() {
        const owner = index_1.repo.getVehicleOwnerByUser(session_1.sessionStore.getCurrentUserId());
        if (!owner)
            return [];
        return index_1.repo.listVehiclesByOwner(owner.id);
    },
    listAvailableDemoVehicles() {
        return index_1.repo.listVehicles().filter((v) => v.ownerId === "owner_demo_unbound");
    },
    bindDemoVehicle(input) {
        const v = index_1.repo.getVehicle(input.vehicleId);
        if (!v)
            throw new order_1.OrderError("NOT_FOUND", "车辆不存在");
        const owner = index_1.repo.getVehicleOwnerByUser(session_1.sessionStore.getCurrentUserId());
        if (!owner)
            throw new order_1.OrderError("FORBIDDEN", "当前用户无车主身份");
        if (v.ownerId === owner.id)
            return v;
        if (v.ownerId !== "owner_demo_unbound")
            throw new order_1.OrderError("FORBIDDEN", "该车辆不在可绑定演示池");
        const updated = Object.assign(Object.assign({}, v), { ownerId: owner.id, updatedAt: clock_1.clock.nowIso() });
        index_1.repo.upsertVehicle(updated);
        // 同步初始化开放规则
        const rule = index_1.repo.getAvailabilityRule(v.id);
        if (!rule) {
            const r = {
                id: identity_1.identity.newId("availability"),
                vehicleId: v.id,
                timezone: "Asia/Shanghai",
                ranges: [
                    { weekdays: [1, 2, 3, 4, 5, 6, 7], startTime: "08:00", endTime: "22:00" },
                ],
                enabled: true,
                createdAt: clock_1.clock.nowIso(),
                updatedAt: clock_1.clock.nowIso(),
            };
            index_1.repo.upsertAvailabilityRule(r);
        }
        return updated;
    },
    vehicleDetail(id) {
        const v = index_1.repo.getVehicle(id);
        if (!v)
            throw new order_1.OrderError("NOT_FOUND", "车辆不存在");
        this.assertOwned(v);
        const rule = index_1.repo.getAvailabilityRule(v.id);
        const model = index_1.repo.getVehicleModel(v.modelId);
        const tasks = this.tasksForVehicle(v.id).items;
        return { vehicle: v, rule, model, tasks };
    },
    saveAvailability(input) {
        var _a, _b, _c, _d;
        const v = index_1.repo.getVehicle(input.vehicleId);
        if (!v)
            throw new order_1.OrderError("NOT_FOUND", "车辆不存在");
        this.assertOwned(v);
        // 校验：已承诺预约不允许破坏
        const reservations = index_1.repo.listReservations().filter((r) => r.vehicleId === v.id && r.status === "scheduled");
        if (reservations.length && !input.enabled) {
            // 关闭共享时不影响已承诺预约
        }
        const now = clock_1.clock.nowIso();
        const updated = Object.assign(Object.assign({}, v), { ownerShared: input.ownerShared, updatedAt: now });
        index_1.repo.upsertVehicle(updated);
        const rule = {
            id: (_b = (_a = index_1.repo.getAvailabilityRule(v.id)) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : identity_1.identity.newId("availability"),
            vehicleId: v.id,
            timezone: "Asia/Shanghai",
            ranges: input.ranges,
            enabled: input.enabled,
            createdAt: (_d = (_c = index_1.repo.getAvailabilityRule(v.id)) === null || _c === void 0 ? void 0 : _c.createdAt) !== null && _d !== void 0 ? _d : now,
            updatedAt: now,
        };
        index_1.repo.upsertAvailabilityRule(rule);
        return rule;
    },
    tasksForVehicle(vehicleId) {
        const vehicle = index_1.repo.getVehicle(vehicleId);
        if (!vehicle)
            throw new order_1.OrderError("NOT_FOUND", "车辆不存在");
        this.assertOwned(vehicle);
        const orders = index_1.repo
            .listOrders()
            .filter((o) => o.assignedVehicleId === vehicleId);
        const items = orders.map((o) => {
            var _a, _b;
            return ({
                orderId: o.id,
                orderNo: o.orderNo,
                status: o.status,
                statusBadge: statusBadge(o.status),
                pickup: this.maskAddress(o.sender),
                dropoff: this.maskAddress(o.receiver),
                scheduledAt: o.scheduledPickupAt,
                estimatedPickupAt: o.estimatedPickupAt,
                estimatedDeliveryAt: o.estimatedDeliveryAt,
                vehicleNo: (_b = (_a = index_1.repo.getVehicle(o.assignedVehicleId)) === null || _a === void 0 ? void 0 : _a.vehicleNo) !== null && _b !== void 0 ? _b : "",
            });
        });
        items.sort((a, b) => (a.estimatedPickupAt || "").localeCompare(b.estimatedPickupAt || ""));
        return { items, total: items.length };
    },
    earnings() {
        const ownerId = session_1.sessionStore.getCurrentOwnerId();
        const alloc = index_1.repo.listAllocations().filter((a) => {
            if (a.recipientType !== "vehicle_owner")
                return false;
            return a.recipientId === ownerId;
        });
        const pending = alloc.filter((a) => a.status !== "settled").reduce((s, a) => s + a.amountFen, 0);
        const settled = alloc.filter((a) => a.status === "settled").reduce((s, a) => s + a.amountFen, 0);
        const orderIds = new Set(alloc.map((a) => a.orderId));
        const orderMap = new Map();
        for (const id of orderIds) {
            const o = index_1.repo.getOrder(id);
            if (o)
                orderMap.set(id, o);
        }
        const items = alloc.map((a) => {
            var _a, _b, _c, _d;
            const o = orderMap.get(a.orderId);
            return {
                id: a.id,
                orderNo: (_a = o === null || o === void 0 ? void 0 : o.orderNo) !== null && _a !== void 0 ? _a : "—",
                vehicleNo: (o === null || o === void 0 ? void 0 : o.assignedVehicleId) ? (_c = (_b = index_1.repo.getVehicle(o.assignedVehicleId)) === null || _b === void 0 ? void 0 : _b.vehicleNo) !== null && _c !== void 0 ? _c : "" : "",
                createdAt: (_d = o === null || o === void 0 ? void 0 : o.createdAt) !== null && _d !== void 0 ? _d : a.createdAt,
                settledAt: a.settledAt,
                amountFen: a.amountFen,
                status: a.status,
            };
        });
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return { pendingFen: pending, settledFen: settled, totalFen: pending + settled, items };
    },
    /** 脱敏：仅显示地址 + 收件人首字 */
    maskAddress(snap) {
        const maskedMobile = snap.contactMobile
            ? snap.contactMobile.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")
            : "";
        const maskedName = snap.contactName ? `${snap.contactName.charAt(0)}**` : "";
        return Object.assign(Object.assign({}, snap), { contactName: maskedName, contactMobile: maskedMobile });
    },
    assertOwned(vehicle) {
        const owner = index_1.repo.getVehicleOwnerByUser(session_1.sessionStore.getCurrentUserId());
        if (!owner || vehicle.ownerId !== owner.id)
            throw new order_1.OrderError("FORBIDDEN", "无权查看或管理该车辆");
    },
};
