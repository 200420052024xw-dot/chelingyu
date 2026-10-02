"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const order_1 = require("../../services/order");
const local_database_1 = require("../../repositories/local-database");
const order_2 = require("../../view-models/order");
const clock_1 = require("../../adapters/clock");
const page_performance_1 = require("../../utils/page-performance");
const remote_1 = require("../../services/remote");
const instance = {};
Page((0, page_performance_1.withPagePerformance)("orders", {
    data: {
        loading: true,
        filter: "payment",
        list: [],
        tabs: [
            { key: "payment", label: "待支付" },
            { key: "in_progress", label: "进行中" },
            { key: "completed", label: "已完成" },
            { key: "all", label: "全部" },
        ],
    },
    onLoad() {
        instance.initialized = false;
        this.refresh();
        instance.unsubscribe = (0, local_database_1.subscribeDB)(() => this.refresh());
    },
    onShow() {
        if ((0, remote_1.isSharedMode)()) {
            this.refresh();
            return;
        }
        order_1.orderService.list({ status: "active" }).forEach((order) => {
            if (order.serviceTimeMode === "scheduled" || order.dispatchSource === "headquarters")
                order_1.orderService.dispatchReadyOrder(order.id);
        });
        this.refresh();
    },
    onUnload() {
        var _a;
        (_a = instance.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(instance);
    },
    async refresh() {
        try {
            const all = (0, remote_1.isSharedMode)() ? await remote_1.sharedOrders.list("all") : order_1.orderService.list({ status: "all" });
            const filter = instance.initialized ? this.data.filter : all.some(o => ["pending_payment", "pending_customer_quote"].includes(o.status)) ? "payment" : "in_progress";
            instance.initialized = true;
            const orders = all.filter(o => filter === "all" || (filter === "payment" ? ["pending_payment", "pending_customer_quote"].includes(o.status) : filter === "in_progress" ? !["pending_payment", "pending_customer_quote", "completed", "cancelled", "failed"].includes(o.status) : o.status === "completed"));
            const list = orders.map((o) => ({
                id: o.id,
                orderNo: o.orderNo,
                status: o.status,
                statusBadge: (0, order_2.statusBadge)(o.status),
                totalAmountFen: o.totalAmountFen,
                sender: o.sender.name,
                senderDetail: o.sender.detail,
                receiver: o.receiver.name,
                receiverDetail: o.receiver.detail,
                vehicleModelName: o.vehicleSnapshot.modelName,
                dispatchSourceLabel: o.dispatchSource === "headquarters" || o.dispatchSource === "platform" ? "平台调度" : "附近车辆",
                scheduledLabel: o.scheduledPickupAt
                    ? `预约用车 ${(0, clock_1.formatDateTime)(o.scheduledPickupAt)}`
                    : `立即用车 ${(0, clock_1.formatDateTime)(o.createdAt)}`,
                actionLabel: o.status === "pending_payment" ? "去支付" : o.status === "pending_customer_quote" ? "确认新报价" : o.status === "awaiting_loading" ? "去确认装货" : o.status === "arrived" ? "去确认收货" : ["completed", "cancelled", "failed"].includes(o.status) ? "查看详情" : "查看进度",
            }));
            this.setData({ list, filter, loading: false });
        }
        catch (error) {
            this.setData({ loading: false });
            wx.showToast({ title: (error === null || error === void 0 ? void 0 : error.message) || "订单加载失败", icon: "none" });
        }
    },
    onTabChange(e) {
        this.setData({ filter: e.currentTarget.dataset.key });
        this.refresh();
    },
    onOpenDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/packages/delivery/pages/detail/index?id=${id}` });
    },
    onPrimaryAction(e) { this.onOpenDetail(e); },
    formatMoney(f) {
        return (0, order_2.formatMoneyFen)(f);
    },
}));
