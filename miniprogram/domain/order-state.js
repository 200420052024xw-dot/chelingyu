"use strict";
/** 订单状态机：定义允许的状态迁移与幂等规则。 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVE_STATUSES = void 0;
exports.canTransition = canTransition;
exports.assertTransition = assertTransition;
exports.isTerminal = isTerminal;
exports.isUserCancelable = isUserCancelable;
exports.isAdvanceable = isAdvanceable;
/** 合法迁移：from -> [to, ...] */
const TRANSITIONS = {
    pending_headquarters_review: ["pending_payment", "failed", "cancelled"],
    pending_dispatch_review: ["pending_payment", "pending_customer_quote", "failed", "cancelled"],
    pending_customer_quote: ["pending_payment", "cancelled"],
    pending_payment: ["paid", "cancelled"],
    paid: ["scheduled", "matching", "failed", "cancelled"],
    scheduled: ["matching", "cancelled"],
    matching: ["dispatched", "failed", "cancelled"],
    dispatched: ["vehicle_to_pickup", "cancelled"],
    vehicle_to_pickup: ["awaiting_loading", "cancelled"],
    awaiting_loading: ["delivering"],
    delivering: ["arrived"],
    arrived: ["completed"],
    completed: [],
    cancelled: [],
    failed: [],
};
exports.ACTIVE_STATUSES = [
    "pending_headquarters_review",
    "pending_dispatch_review",
    "pending_customer_quote",
    "pending_payment",
    "paid",
    "scheduled",
    "matching",
    "dispatched",
    "vehicle_to_pickup",
    "awaiting_loading",
    "delivering",
    "arrived",
];
function canTransition(from, to) {
    var _a, _b;
    return (_b = (_a = TRANSITIONS[from]) === null || _a === void 0 ? void 0 : _a.includes(to)) !== null && _b !== void 0 ? _b : false;
}
function assertTransition(from, to) {
    if (from === to)
        return null;
    if (!canTransition(from, to)) {
        return {
            code: "INVALID_TRANSITION",
            message: `订单状态不允许从 ${from} 迁移到 ${to}`,
            retryable: false,
        };
    }
    return null;
}
function isTerminal(status) {
    return ["completed", "cancelled", "failed"].includes(status);
}
/** 用户侧可主动操作的取消窗口 */
function isUserCancelable(status) {
    return ["pending_headquarters_review", "pending_dispatch_review", "pending_customer_quote", "pending_payment", "paid", "scheduled", "matching", "dispatched", "vehicle_to_pickup"].includes(status);
}
/** 是否允许用户推进（演示） */
function isAdvanceable(status) {
    return [
        "paid",
        "scheduled",
        "matching",
        "dispatched",
        "vehicle_to_pickup",
        "awaiting_loading",
        "delivering",
        "arrived",
    ].includes(status);
}
