"use strict";
/** 通用仓库方法：避免服务层直接操作底层集合 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.repo = void 0;
const local_database_1 = require("./local-database");
exports.repo = {
    // ---- 用户/地址/区域 ----
    listUsers() {
        return [...(0, local_database_1.getDB)().users];
    },
    getUser(id) {
        return (0, local_database_1.getDB)().users.find((u) => u.id === id);
    },
    listAddresses(userId) {
        return (0, local_database_1.getDB)().addresses.filter((a) => a.userId === userId);
    },
    upsertAddress(a) {
        const db = (0, local_database_1.getDB)();
        const idx = db.addresses.findIndex((x) => x.id === a.id);
        if (idx >= 0)
            db.addresses[idx] = a;
        else
            db.addresses.push(a);
        (0, local_database_1.commitDB)();
    },
    removeAddress(id) {
        const db = (0, local_database_1.getDB)();
        db.addresses = db.addresses.filter((x) => x.id !== id);
        (0, local_database_1.commitDB)();
    },
    listRegions() {
        return [...(0, local_database_1.getDB)().regions];
    },
    listServiceAreas() {
        return [...(0, local_database_1.getDB)().serviceAreas];
    },
    getServiceArea(id) {
        return (0, local_database_1.getDB)().serviceAreas.find((a) => a.id === id);
    },
    // ---- 车辆 ----
    listVehicleModels() {
        return [...(0, local_database_1.getDB)().vehicleModels];
    },
    getVehicleModel(id) {
        return (0, local_database_1.getDB)().vehicleModels.find((m) => m.id === id);
    },
    upsertVehicleModel(model) {
        const db = (0, local_database_1.getDB)();
        const index = db.vehicleModels.findIndex(m => m.id === model.id);
        if (index >= 0)
            db.vehicleModels[index] = model;
        else
            db.vehicleModels.push(model);
        (0, local_database_1.commitDB)();
    },
    listVehicles() {
        return [...(0, local_database_1.getDB)().vehicles];
    },
    getVehicle(id) {
        return (0, local_database_1.getDB)().vehicles.find((v) => v.id === id);
    },
    listVehiclesByOwner(ownerId) {
        return (0, local_database_1.getDB)().vehicles.filter((v) => v.ownerId === ownerId);
    },
    upsertVehicle(v) {
        const db = (0, local_database_1.getDB)();
        const idx = db.vehicles.findIndex((x) => x.id === v.id);
        if (idx >= 0)
            db.vehicles[idx] = v;
        else
            db.vehicles.push(v);
        (0, local_database_1.commitDB)();
    },
    listAvailabilityRules() {
        return [...(0, local_database_1.getDB)().availabilityRules];
    },
    getAvailabilityRule(vehicleId) {
        return (0, local_database_1.getDB)().availabilityRules.find((r) => r.vehicleId === vehicleId);
    },
    upsertAvailabilityRule(r) {
        const db = (0, local_database_1.getDB)();
        const idx = db.availabilityRules.findIndex((x) => x.id === r.id);
        if (idx >= 0)
            db.availabilityRules[idx] = r;
        else
            db.availabilityRules.push(r);
        (0, local_database_1.commitDB)();
    },
    listReservations() {
        return [...(0, local_database_1.getDB)().reservations];
    },
    upsertReservation(r) {
        const db = (0, local_database_1.getDB)();
        const idx = db.reservations.findIndex((x) => x.id === r.id);
        if (idx >= 0)
            db.reservations[idx] = r;
        else
            db.reservations.push(r);
        (0, local_database_1.commitDB)();
    },
    // ---- 草稿/报价/订单 ----
    listDrafts() {
        return [...(0, local_database_1.getDB)().drafts];
    },
    getDraft(id) {
        return (0, local_database_1.getDB)().drafts.find((d) => d.id === id);
    },
    upsertDraft(d) {
        const db = (0, local_database_1.getDB)();
        const idx = db.drafts.findIndex((x) => x.id === d.id);
        if (idx >= 0)
            db.drafts[idx] = d;
        else
            db.drafts.push(d);
        (0, local_database_1.commitDB)();
    },
    removeDraft(id) {
        const db = (0, local_database_1.getDB)();
        db.drafts = db.drafts.filter((d) => d.id !== id);
        (0, local_database_1.commitDB)();
    },
    listQuotes() {
        return [...(0, local_database_1.getDB)().quotes];
    },
    getQuote(id) {
        return (0, local_database_1.getDB)().quotes.find((q) => q.id === id);
    },
    upsertQuote(q) {
        const db = (0, local_database_1.getDB)();
        const idx = db.quotes.findIndex((x) => x.id === q.id);
        if (idx >= 0)
            db.quotes[idx] = q;
        else
            db.quotes.push(q);
        (0, local_database_1.commitDB)();
    },
    listOrders() {
        return [...(0, local_database_1.getDB)().orders];
    },
    getOrder(id) {
        return (0, local_database_1.getDB)().orders.find((o) => o.id === id);
    },
    upsertOrder(o) {
        const db = (0, local_database_1.getDB)();
        const idx = db.orders.findIndex((x) => x.id === o.id);
        if (idx >= 0)
            db.orders[idx] = o;
        else
            db.orders.push(o);
        (0, local_database_1.commitDB)();
    },
    listOrderEvents(orderId) {
        return (0, local_database_1.getDB)().orderEvents.filter((e) => e.orderId === orderId).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    },
    appendOrderEvent(e) {
        (0, local_database_1.getDB)().orderEvents.push(e);
        (0, local_database_1.commitDB)();
    },
    listDispatchRecords() {
        var _a;
        return [...(_a = (0, local_database_1.getDB)().dispatchRecords) !== null && _a !== void 0 ? _a : []];
    },
    upsertDispatchRecord(d) {
        const db = (0, local_database_1.getDB)();
        if (!db.dispatchRecords)
            db.dispatchRecords = [];
        const idx = db.dispatchRecords.findIndex((x) => x.id === d.id);
        if (idx >= 0)
            db.dispatchRecords[idx] = d;
        else
            db.dispatchRecords.push(d);
        (0, local_database_1.commitDB)();
    },
    // ---- 价格/分润 ----
    listPricingPolicies() {
        return [...(0, local_database_1.getDB)().pricingPolicies];
    },
    getPricingPolicy(id) {
        return (0, local_database_1.getDB)().pricingPolicies.find((p) => p.id === id);
    },
    getDefaultPricingPolicy() {
        return (0, local_database_1.getDB)().pricingPolicies.find((p) => p.enabled);
    },
    listRevenueSharingRules() {
        return [...(0, local_database_1.getDB)().revenueSharingRules];
    },
    getDefaultSharingRule() {
        return (0, local_database_1.getDB)().revenueSharingRules.find((r) => r.enabled);
    },
    // ---- 支付/退款 ----
    listPayments() {
        return [...(0, local_database_1.getDB)().payments];
    },
    upsertPayment(p) {
        const db = (0, local_database_1.getDB)();
        const idx = db.payments.findIndex((x) => x.id === p.id);
        if (idx >= 0)
            db.payments[idx] = p;
        else
            db.payments.push(p);
        (0, local_database_1.commitDB)();
    },
    listRefunds() {
        return [...(0, local_database_1.getDB)().refunds];
    },
    upsertRefund(r) {
        const db = (0, local_database_1.getDB)();
        const idx = db.refunds.findIndex((x) => x.id === r.id);
        if (idx >= 0)
            db.refunds[idx] = r;
        else
            db.refunds.push(r);
        (0, local_database_1.commitDB)();
    },
    listAllocations() {
        return [...(0, local_database_1.getDB)().revenueAllocations];
    },
    upsertAllocation(a) {
        const db = (0, local_database_1.getDB)();
        const idx = db.revenueAllocations.findIndex((x) => x.id === a.id);
        if (idx >= 0)
            db.revenueAllocations[idx] = a;
        else
            db.revenueAllocations.push(a);
        (0, local_database_1.commitDB)();
    },
    // ---- 通知/工单 ----
    listNotifications(userId) {
        return (0, local_database_1.getDB)().notifications.filter((n) => n.userId === userId);
    },
    upsertNotification(n) {
        const db = (0, local_database_1.getDB)();
        const idx = db.notifications.findIndex((x) => x.id === n.id);
        if (idx >= 0)
            db.notifications[idx] = n;
        else
            db.notifications.push(n);
        (0, local_database_1.commitDB)();
    },
    listSupportTickets(userId) {
        const all = (0, local_database_1.getDB)().supportTickets;
        return userId ? all.filter((t) => t.creatorUserId === userId) : [...all];
    },
    upsertSupportTicket(t) {
        const db = (0, local_database_1.getDB)();
        const idx = db.supportTickets.findIndex((x) => x.id === t.id);
        if (idx >= 0)
            db.supportTickets[idx] = t;
        else
            db.supportTickets.push(t);
        (0, local_database_1.commitDB)();
    },
    listVehicleOwners() {
        return [...(0, local_database_1.getDB)().vehicleOwners];
    },
    getVehicleOwnerByUser(userId) {
        return (0, local_database_1.getDB)().vehicleOwners.find((o) => o.userId === userId);
    },
};
