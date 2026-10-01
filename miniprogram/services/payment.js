"use strict";
/** Payment Service (mock) */
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = void 0;
const index_1 = require("../repositories/index");
const identity_1 = require("../adapters/identity");
const clock_1 = require("../adapters/clock");
const session_1 = require("../stores/session");
const order_1 = require("./order");
exports.paymentService = {
    payMock(input) {
        const order = index_1.repo.getOrder(input.orderId);
        if (!order)
            throw new order_1.OrderError("NOT_FOUND", "订单不存在");
        if (order.customerId !== session_1.sessionStore.getCurrentUserId())
            throw new order_1.OrderError("FORBIDDEN", "无权操作");
        // 幂等：已有 succeeded 的支付则直接返回
        const existing = index_1.repo.listPayments().find((p) => p.orderId === order.id && p.status === "succeeded");
        if (existing && input.scenario === "success" && !["cancelled", "failed"].includes(order.status)) {
            return { payment: existing, order };
        }
        if (order.status !== "pending_payment") {
            throw new order_1.OrderError("INVALID_TRANSITION", "当前订单不能支付");
        }
        if (input.scenario === "cancel") {
            throw new order_1.OrderError("VALIDATION_ERROR", "用户取消支付");
        }
        const now = clock_1.clock.nowIso();
        const payment = {
            id: identity_1.identity.newId("pay"),
            paymentNo: identity_1.identity.newPaymentNo(),
            orderId: order.id,
            payerUserId: session_1.sessionStore.getCurrentUserId(),
            channel: "mock",
            amountFen: order.totalAmountFen,
            status: input.scenario === "success" ? "succeeded" : "failed",
            paidAt: input.scenario === "success" ? now : undefined,
            createdAt: now,
            updatedAt: now,
        };
        index_1.repo.upsertPayment(payment);
        if (payment.status === "succeeded") {
            // 标记订单 paid
            const paid = order_1.orderService.advance({ orderId: order.id });
            const updated = paid.status === "paid" ? order_1.orderService.advance({ orderId: order.id }) : paid;
            return { payment, order: updated };
        }
        return { payment, order };
    },
};
