"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_performance_1 = require("../../../../utils/page-performance");
const support_1 = require("../../../../services/support");
const index_1 = require("../../../../repositories/index");
const clock_1 = require("../../../../adapters/clock");
const CATEGORY_DEFS = [
    { key: "order", label: "订单问题", icon: "/assets/icons/box.png" },
    { key: "vehicle", label: "车辆问题", icon: "/assets/icons/vehicle.png" },
    { key: "payment", label: "支付/退款", icon: "/assets/icons/money.png" },
    { key: "complaint", label: "投诉建议", icon: "/assets/icons/support.png" },
    { key: "other", label: "其他", icon: "/assets/icons/chat.png" },
];
const STATUS_LABELS = {
    open: "待处理",
    processing: "处理中",
    resolved: "已解决",
    closed: "已关闭",
};
Page((0, page_performance_1.withPagePerformance)("packages/account/pages/support/index", {
    data: {
        categories: CATEGORY_DEFS,
        tickets: [],
        draftCategory: "order",
        draftDescription: "",
        linkedOrderId: "",
        linkedOrderNo: "",
    },
    onLoad(query) {
        const orderId = (query === null || query === void 0 ? void 0 : query.orderId) || "";
        let orderNo = "";
        if (orderId) {
            try {
                const order = index_1.repo.getOrder(orderId);
                orderNo = (order === null || order === void 0 ? void 0 : order.orderNo) || "";
            }
            catch (_a) {
                // 忽略，单纯 link 不存在
            }
        }
        this.setData({
            linkedOrderId: orderId,
            linkedOrderNo: orderNo,
            draftCategory: orderId ? "order" : "order",
            draftDescription: orderId && orderNo ? `订单问题：订单号 ${orderNo}，请补充问题详情。` : "",
        });
        this.refresh();
    },
    refresh() {
        this.setData({ tickets: support_1.supportService.list() });
    },
    onPickDraftCategory(e) {
        this.setData({ draftCategory: e.currentTarget.dataset.key });
    },
    onDraftDescription(e) {
        this.setData({ draftDescription: e.detail.value });
    },
    onSubmit() {
        const { draftCategory, draftDescription, linkedOrderId } = this.data;
        if (!draftDescription.trim()) {
            wx.showToast({ title: "请输入问题描述", icon: "none" });
            return;
        }
        support_1.supportService.create({
            category: draftCategory,
            description: draftDescription.trim(),
            orderId: linkedOrderId || undefined,
        });
        this.setData({ draftDescription: "" });
        this.refresh();
        wx.showToast({ title: "已提交", icon: "success" });
    },
    formatCategory(key) {
        var _a;
        return ((_a = CATEGORY_DEFS.find((c) => c.key === key)) === null || _a === void 0 ? void 0 : _a.label) || key;
    },
    formatStatus(s) {
        return STATUS_LABELS[s] || s;
    },
    formatRelative(iso) {
        return (0, clock_1.formatRelativeMinutes)(iso);
    },
}));
