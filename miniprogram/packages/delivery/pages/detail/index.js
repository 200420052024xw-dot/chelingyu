"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const order_1 = require("../../../../services/order");
const payment_1 = require("../../../../services/payment");
const local_database_1 = require("../../../../repositories/local-database");
const order_2 = require("../../../../view-models/order");
const identity_1 = require("../../../../adapters/identity");
const clock_1 = require("../../../../adapters/clock");
const page_performance_1 = require("../../../../utils/page-performance");
const ORDER_STEPS = [
    { key: "pending_payment", label: "待支付" },
    { key: "paid", label: "已支付" },
    { key: "matching", label: "匹配车辆" },
    { key: "dispatched", label: "已派车" },
    { key: "vehicle_to_pickup", label: "前往取件" },
    { key: "awaiting_loading", label: "等待装货" },
    { key: "delivering", label: "配送中" },
    { key: "arrived", label: "已到达" },
    { key: "completed", label: "已完成" },
];
const STATUS_ICONS = {
    pending_payment: "/assets/icons/money.png",
    paid: "/assets/icons/check.png",
    matching: "/assets/icons/search.png",
    dispatched: "/assets/icons/box.png",
    vehicle_to_pickup: "/assets/icons/vehicle.png",
    awaiting_loading: "/assets/icons/box.png",
    delivering: "/assets/icons/route.png",
    arrived: "/assets/icons/location.png",
    completed: "/assets/icons/pay-success.png",
    cancelled: "/assets/icons/close.png",
    failed: "/assets/icons/pay-fail.png",
};
const detailPageInstance = {};
Page((0, page_performance_1.withPagePerformance)("delivery/detail", {
    data: {
        orderId: "",
        loading: true,
        view: null,
        cancelModalOpen: false,
        cancelReason: "",
        payProcessing: false,
        statusBadge: { text: "", tone: "neutral" },
        statusHint: "",
        statusIcon: "/assets/icons/box.png",
        statusStepIndex: 0,
        orderSteps: ORDER_STEPS,
        timeline: [],
        cancelReasons: [
            { label: "临时改变计划", value: "临时改变计划" },
            { label: "信息填写错误", value: "信息填写错误" },
            { label: "其他原因", value: "其他原因" },
        ],
    },
    onLoad(query) {
        const orderId = query === null || query === void 0 ? void 0 : query.id;
        this.setData({ orderId });
        this.refresh();
        detailPageInstance.unsubscribe = (0, local_database_1.subscribeDB)(() => this.refresh());
    },
    onUnload() {
        var _a;
        (_a = detailPageInstance.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(detailPageInstance);
    },
    refresh() {
        try {
            const view = order_1.orderService.detail(this.data.orderId);
            const timeline = this.buildTimeline(view.order, view.events);
            const stepIndex = ORDER_STEPS.findIndex((s) => s.key === view.order.status);
            this.setData({
                view,
                loading: false,
                statusBadge: (0, order_2.statusBadge)(view.order.status),
                statusHint: view.order.dispatchSource === "headquarters"
                    ? (view.order.status === "pending_payment" ? "总部已确认可调车，完成支付后进入调度" : "总部调车申请已确认，预计时间以调度联系为准")
                    : (0, order_2.statusHint)(view.order.status),
                statusIcon: STATUS_ICONS[view.order.status] || "/assets/icons/box.png",
                statusStepIndex: stepIndex >= 0 ? stepIndex : 0,
                timeline,
            });
        }
        catch (e) {
            this.setData({ loading: false });
        }
    },
    buildTimeline(order, events) {
        const sortedEvents = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
        const items = sortedEvents.map((e) => ({
            label: (0, order_2.timelineEventLabel)(e),
            time: (0, order_2.formatEventTime)(e),
            isCurrent: false,
            isFuture: false,
            actor: e.actorType,
        }));
        return items.map((it, idx) => (Object.assign(Object.assign({}, it), { isCurrent: idx === items.length - 1 && !["completed", "cancelled", "failed"].includes(order.status), isFuture: false })));
    },
    formatMoney(f) {
        return (0, order_2.formatMoneyFen)(f);
    },
    async onPay() {
        if (!this.data.view)
            return;
        this.setData({ payProcessing: true });
        setTimeout(() => {
            try {
                payment_1.paymentService.payMock({
                    orderId: this.data.view.order.id,
                    requestId: identity_1.identity.newRequestId(),
                    scenario: "success",
                });
                this.setData({ payProcessing: false });
                this.refresh();
            }
            catch (e) {
                wx.showToast({ title: e.message || "支付失败", icon: "none" });
                this.setData({ payProcessing: false });
            }
        }, 600);
    },
    onAdvance() {
        try {
            order_1.orderService.advance({ orderId: this.data.orderId });
            this.refresh();
            wx.showToast({ title: "已推进订单", icon: "success" });
        }
        catch (e) {
            wx.showToast({ title: e.message || "推进失败", icon: "none" });
        }
    },
    onConfirmLoaded() {
        try {
            order_1.orderService.confirmLoaded(this.data.orderId);
            this.refresh();
        }
        catch (e) {
            wx.showToast({ title: e.message || "操作失败", icon: "none" });
        }
    },
    onConfirmReceived() {
        wx.showModal({
            title: "确认收货",
            content: "请确认已收到货物，本次操作不可撤销",
            success: (r) => {
                if (r.confirm) {
                    try {
                        order_1.orderService.confirmReceived(this.data.orderId);
                        this.refresh();
                    }
                    catch (e) {
                        wx.showToast({ title: e.message || "操作失败", icon: "none" });
                    }
                }
            },
        });
    },
    onOpenCancel() {
        this.setData({ cancelModalOpen: true, cancelReason: "临时改变计划" });
    },
    onCloseCancel() {
        this.setData({ cancelModalOpen: false });
    },
    onPickCancelReason(e) {
        this.setData({ cancelReason: e.currentTarget.dataset.value });
    },
    onConfirmCancel() {
        try {
            order_1.orderService.cancel({
                orderId: this.data.orderId,
                reason: this.data.cancelReason,
            });
            this.setData({ cancelModalOpen: false });
            this.refresh();
        }
        catch (e) {
            wx.showToast({ title: e.message || "取消失败", icon: "none" });
        }
    },
    onCallSupport() {
        wx.navigateTo({ url: `/packages/account/pages/support/index?orderId=${this.data.orderId}` });
    },
    onAdvanceClock() {
        (0, clock_1.advanceDemoClock)(10);
        wx.showToast({ title: "模拟时间 +10 分钟", icon: "none" });
    },
    onRetryPay() {
        this.onPay();
    },
}));
