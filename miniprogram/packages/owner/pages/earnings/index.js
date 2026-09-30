"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_performance_1 = require("../../../../utils/page-performance");
const owner_1 = require("../../../../services/owner");
const local_database_1 = require("../../../../repositories/local-database");
const order_1 = require("../../../../view-models/order");
const clock_1 = require("../../../../adapters/clock");
const instance = {};
Page((0, page_performance_1.withPagePerformance)("packages/owner/pages/earnings/index", {
    data: {
        earnings: { pendingFen: 0, settledFen: 0, totalFen: 0, items: [] },
        range: "all",
        filteredItems: [],
        loading: true,
    },
    onLoad() {
        this.refresh();
        instance.unsubscribe = (0, local_database_1.subscribeDB)(() => this.refresh());
    },
    onUnload() {
        var _a;
        (_a = instance.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(instance);
    },
    refresh() {
        const earnings = owner_1.ownerService.earnings();
        const filtered = this.applyFilter(earnings.items, this.data.range);
        this.setData({ earnings, filteredItems: filtered, loading: false });
    },
    applyFilter(items, range) {
        if (range === "all")
            return items;
        if (range === "settled")
            return items.filter((i) => i.status === "settled");
        return items.filter((i) => i.status !== "settled");
    },
    onSwitchRange(e) {
        const range = e.currentTarget.dataset.range;
        this.setData({ range });
        this.refresh();
    },
    onWithdraw() {
        wx.showModal({
            title: "模拟收益说明",
            content: "当前为本地演示版，收益仅用于展示，不支持真实提现。",
            showCancel: false,
        });
    },
    formatMoney(f) {
        return (0, order_1.formatMoneyFen)(f);
    },
    formatDate(iso) {
        if (!iso)
            return "—";
        return (0, clock_1.formatDateTime)(iso);
    },
}));
