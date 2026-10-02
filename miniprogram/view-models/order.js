"use strict";
/** View Models: 实体 → 页面展示数据 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMoneyFen = formatMoneyFen;
exports.formatMoneyFenShort = formatMoneyFenShort;
exports.statusBadge = statusBadge;
exports.customerOrderStage = customerOrderStage;
exports.statusHint = statusHint;
exports.timelineEventLabel = timelineEventLabel;
exports.formatEventTime = formatEventTime;
exports.formatOrderTime = formatOrderTime;
exports.formatOrderDayTime = formatOrderDayTime;
const clock_1 = require("../adapters/clock");
function formatMoneyFen(fen) {
    return `¥${(fen / 100).toFixed(2)}`;
}
function formatMoneyFenShort(fen) {
    return `¥${(fen / 100).toFixed(fen % 100 === 0 ? 0 : 2)}`;
}
function statusBadge(status) {
    switch (status) {
        case "pending_headquarters_review": return { text: "审核中", tone: "warning" };
        case "pending_dispatch_review": return { text: "审核中", tone: "warning" };
        case "pending_customer_quote": return { text: "待确认报价", tone: "warning" };
        case "pending_payment": return { text: "待支付", tone: "warning" };
        case "paid": return { text: "待派车", tone: "info" };
        case "scheduled": return { text: "待派车", tone: "info" };
        case "matching": return { text: "待派车", tone: "info" };
        case "dispatched": return { text: "取件中", tone: "info" };
        case "vehicle_to_pickup": return { text: "取件中", tone: "info" };
        case "awaiting_loading": return { text: "待确认装货", tone: "warning" };
        case "delivering": return { text: "配送中", tone: "info" };
        case "arrived": return { text: "待收货", tone: "warning" };
        case "completed": return { text: "已完成", tone: "success" };
        case "cancelled": return { text: "已取消", tone: "neutral" };
        case "failed": return { text: "异常结束", tone: "danger" };
        default: return { text: status, tone: "neutral" };
    }
}
/** 用户侧五段进度。结束订单停在最后一次实际到达的阶段。 */
function customerOrderStage(status, events = []) {
    if (status === "completed")
        return 4;
    if (status === "cancelled" || status === "failed") {
        const prior = [...events]
            .filter((event) => event.toStatus !== "cancelled" && event.toStatus !== "failed")
            .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
        return prior.length ? customerOrderStage(prior[prior.length - 1].toStatus) : 0;
    }
    if (status === "delivering" || status === "arrived")
        return 3;
    if (["paid", "scheduled", "matching", "dispatched", "vehicle_to_pickup", "awaiting_loading"].includes(status))
        return 2;
    if (status === "pending_payment")
        return 1;
    return 0;
}
function statusHint(status) {
    switch (status) {
        case "pending_headquarters_review": return "申请已提交，等待平台调度确认后再支付";
        case "pending_dispatch_review": return "申请已提交，等待平台调度确认后再支付";
        case "pending_customer_quote": return "平台推荐了新车型，请确认报价后再支付";
        case "pending_payment": return "请尽快完成支付";
        case "paid": return "已支付，等待安排车辆";
        case "scheduled": return "已预约，等待车辆安排";
        case "matching": return "正在为您协调可用运力";
        case "dispatched": return "已分配车辆，即将前往取件";
        case "vehicle_to_pickup": return "车辆正在前往取件点";
        case "awaiting_loading": return "车辆已到达，请确认装货";
        case "delivering": return "车辆正在配送中";
        case "arrived": return "车辆已到达收件点，请确认收货";
        case "completed": return "订单已完成";
        case "cancelled": return "订单已取消";
        case "failed": return "订单未能继续，请查看处理说明及退款状态";
        default: return "";
    }
}
function timelineEventLabel(e) {
    switch (e.toStatus) {
        case "pending_headquarters_review": return "已提交平台调度确认";
        case "pending_dispatch_review": return "已提交平台调度确认";
        case "pending_customer_quote": return "等待客户确认新报价";
        case "pending_payment": return "等待支付";
        case "paid": return "模拟支付成功";
        case "scheduled": return "已生成预约";
        case "matching": return "系统匹配中";
        case "dispatched": return "已分配车辆";
        case "vehicle_to_pickup": return "车辆前往取件点";
        case "awaiting_loading": return "车辆已到达取件点";
        case "delivering": return "装货完成，开始配送";
        case "arrived": return "车辆已到达收件点";
        case "completed": return "订单完成";
        case "cancelled": return "订单已取消";
        case "failed": return "订单失败";
        default: return e.toStatus;
    }
}
function formatEventTime(e) {
    return (0, clock_1.formatDateTime)(e.occurredAt);
}
function formatOrderTime(iso) {
    if (!iso)
        return "";
    return (0, clock_1.formatDateTime)(iso);
}
function formatOrderDayTime(iso) {
    if (!iso)
        return "";
    return (0, clock_1.formatTime)(iso);
}
