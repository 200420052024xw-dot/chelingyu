"use strict";
/** View Models: 实体 → 页面展示数据 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMoneyFen = formatMoneyFen;
exports.formatMoneyFenShort = formatMoneyFenShort;
exports.statusBadge = statusBadge;
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
function statusHint(status) {
    switch (status) {
        case "pending_payment": return "请尽快完成支付";
        case "paid": return "系统正在匹配车辆";
        case "scheduled": return "已预约，等待到达预约时间";
        case "matching": return "正在为您匹配附近运力";
        case "dispatched": return "已分配车辆，即将前往取件";
        case "vehicle_to_pickup": return "车辆正在前往取件点";
        case "awaiting_loading": return "车辆已到达，请确认装货";
        case "delivering": return "车辆正在配送中";
        case "arrived": return "车辆已到达收件点，请确认收货";
        case "completed": return "订单已完成";
        case "cancelled": return "订单已取消";
        case "failed": return "订单失败，已退款";
        default: return "";
    }
}
function timelineEventLabel(e) {
    switch (e.toStatus) {
        case "pending_payment": return "已创建订单";
        case "paid": return "支付成功";
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
