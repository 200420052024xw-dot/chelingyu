"use strict";
/** 订单草稿临时状态（页面间共享） */
Object.defineProperty(exports, "__esModule", { value: true });
exports.draftStore = void 0;
const index_1 = require("../config/index");
let activeDraft = null;
const listeners = new Set();
function notify() {
    listeners.forEach((fn) => fn());
}
exports.draftStore = {
    get() {
        return activeDraft;
    },
    set(d) {
        activeDraft = d;
        notify();
    },
    clear() {
        activeDraft = null;
        notify();
    },
    /** 创建或恢复当前用户的草稿 */
    ensure() {
        if (activeDraft)
            return activeDraft;
        const now = new Date().toISOString();
        activeDraft = {
            id: `draft_${Date.now().toString(36)}`,
            userId: index_1.APP_CONFIG.demoUserId,
            revision: 1,
            serviceTimeMode: "immediate",
            createdAt: now,
            updatedAt: now,
        };
        notify();
        return activeDraft;
    },
    /** 任意修改：版本号递增 */
    mutate(patch) {
        const d = this.ensure();
        const next = patch(Object.assign({}, d));
        next.revision = d.revision + 1;
        next.updatedAt = new Date().toISOString();
        // 修改草稿时清除当前报价
        next.selectedQuoteId = undefined;
        next.inputFingerprint = undefined;
        activeDraft = next;
        notify();
        return next;
    },
    setSender(snap) {
        return this.mutate((d) => (Object.assign(Object.assign({}, d), { sender: snap })));
    },
    setReceiver(snap) {
        return this.mutate((d) => (Object.assign(Object.assign({}, d), { receiver: snap })));
    },
    setServiceTime(mode, scheduledAt) {
        return this.mutate((d) => (Object.assign(Object.assign({}, d), { serviceTimeMode: mode, scheduledPickupAt: scheduledAt })));
    },
    setCargo(cargo) {
        return this.mutate((d) => (Object.assign(Object.assign({}, d), { cargo })));
    },
    setSelectedModel(modelId) {
        return this.mutate((d) => (Object.assign(Object.assign({}, d), { selectedVehicleModelId: modelId })));
    },
    attachQuote(quoteId, fingerprint) {
        return this.mutate((d) => (Object.assign(Object.assign({}, d), { selectedQuoteId: quoteId, inputFingerprint: fingerprint })));
    },
    subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
};
