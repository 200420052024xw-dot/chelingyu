/** Payment Service (mock) */

import type { DeliveryOrder, ID, Payment, Refund } from "../contracts/types";
import { repo } from "../repositories/index";
import { identity } from "../adapters/identity";
import { clock } from "../adapters/clock";
import { sessionStore } from "../stores/session";
import { orderService, OrderError } from "./order";

export interface PayMockInput {
  orderId: ID;
  requestId: string;
  /** success / fail / cancel */
  scenario: "success" | "fail" | "cancel";
}

export const paymentService = {
  payMock(input: PayMockInput): { payment?: Payment; order: DeliveryOrder; refund?: Refund } {
    const order = repo.getOrder(input.orderId);
    if (!order) throw new OrderError("NOT_FOUND", "订单不存在");
    if (order.customerId !== sessionStore.getCurrentUserId()) throw new OrderError("FORBIDDEN", "无权操作");

    // 幂等：已有 succeeded 的支付则直接返回
    const existing = repo.listPayments().find((p) => p.orderId === order.id && p.status === "succeeded");
    if (existing && input.scenario === "success" && !["cancelled", "failed"].includes(order.status)) {
      return { payment: existing, order };
    }

    if (order.status !== "pending_payment") {
      throw new OrderError("INVALID_TRANSITION", "当前订单不能支付");
    }

    if (input.scenario === "cancel") {
      throw new OrderError("VALIDATION_ERROR", "用户取消支付");
    }

    const now = clock.nowIso();
    const payment: Payment = {
      id: identity.newId("pay"),
      paymentNo: identity.newPaymentNo(),
      orderId: order.id,
      payerUserId: sessionStore.getCurrentUserId(),
      channel: "mock",
      amountFen: order.totalAmountFen,
      status: input.scenario === "success" ? "succeeded" : "failed",
      paidAt: input.scenario === "success" ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };
    repo.upsertPayment(payment);

    if (payment.status === "succeeded") {
      // 标记订单 paid
      const paid = orderService.advance({ orderId: order.id });
      const updated = paid.status === "paid" ? orderService.advance({ orderId: order.id }) : paid;
      return { payment, order: updated };
    }
    return { payment, order };
  },
};
