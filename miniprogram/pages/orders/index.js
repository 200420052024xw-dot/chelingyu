"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const order_1 = require("../../services/order");
const local_database_1 = require("../../repositories/local-database");
const order_2 = require("../../view-models/order");
const clock_1 = require("../../adapters/clock");
const page_performance_1 = require("../../utils/page-performance");
const instance = {};
Page((0, page_performance_1.withPagePerformance)("orders", {
    data: {
        loading: true,
        filter: "all",
        list: [],
        tabs: [
            { key: "all", label: "全部" },
            { key: "active", label: "进行中" },
            { key: "pending_payment", label: "待支付" },
            { key: "completed", label: "已完成" },
            { key: "cancelled", label: "已取消" },
        ],
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
        const orders = order_1.orderService.list({ status: this.data.filter });
        const list = orders.map((o) => ({
            id: o.id,
            orderNo: o.orderNo,
            status: o.status,
            statusBadge: (0, order_2.statusBadge)(o.status),
            totalAmountFen: o.totalAmountFen,
            createdAt: (0, clock_1.formatDateTime)(o.createdAt),
            sender: o.sender.name,
            receiver: o.receiver.name,
            vehicleModelName: o.vehicleSnapshot.modelName,
            dispatchSourceLabel: o.dispatchSource === "headquarters" ? "总部调车" : "附近演示运力",
        }));
        this.setData({ list, loading: false });
    },
    onTabChange(e) {
        this.setData({ filter: e.currentTarget.dataset.key });
        this.refresh();
    },
    onOpenDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/packages/delivery/pages/detail/index?id=${id}` });
    },
    formatMoney(f) {
        return (0, order_2.formatMoneyFen)(f);
    },
}));
