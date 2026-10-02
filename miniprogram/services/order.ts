/** Order Service */

import type {
  DeliveryOrder,
  DispatchRecord,
  ID,
  MoneyFen,
  OrderDetailView,
  OrderStatus,
  OrderStatusEvent,
  Payment,
  Quote,
  Refund,
  Vehicle,
} from "../contracts/types";
import { repo } from "../repositories/index";
import { assertTransition, isUserCancelable } from "../domain/order-state";
import { evaluateModelForCargo, pickDispatchedVehicle } from "../domain/scheduling";
import { allocateRevenue } from "../domain/revenue";
import { clock } from "../adapters/clock";
import { identity } from "../adapters/identity";
import { sessionStore } from "../stores/session";
import { PricingError } from "./pricing";
import { APP_CONFIG } from "../config/index";

export class OrderError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function pushEvent(
  orderId: ID,
  toStatus: OrderStatus,
  fromStatus: OrderStatus | undefined,
  actorType: OrderStatusEvent["actorType"],
  actorId?: ID,
  note?: string,
): OrderStatusEvent {
  const e: OrderStatusEvent = {
    id: identity.newId("evt"),
    orderId,
    fromStatus,
    toStatus,
    actorType,
    actorId,
    occurredAt: clock.nowIso(),
    note,
    createdAt: clock.nowIso(),
    updatedAt: clock.nowIso(),
  };
  repo.appendOrderEvent(e);
  return e;
}

function transitionOrder(order: DeliveryOrder, to: OrderStatus, note?: string, actorId?: ID, actorType?: OrderStatusEvent["actorType"]): DeliveryOrder {
  const err = assertTransition(order.status, to);
  if (err) throw new OrderError(err.code, err.message);
  const updated: DeliveryOrder = {
    ...order,
    status: to,
    updatedAt: clock.nowIso(),
  };
  if (to === "completed") updated.actualDeliveryAt = clock.nowIso();
  if (to === "delivering") updated.actualPickupAt = clock.nowIso();
  if (to === "cancelled") updated.cancelledAt = clock.nowIso();
  repo.upsertOrder(updated);
  pushEvent(order.id, to, order.status, actorType ?? (actorId ? "customer" : "system"), actorId, note);
  return updated;
}

export const orderService = {
  /** 通过草稿 + 报价幂等创建待支付订单 */
  create(input: { draftId: ID; quoteId: ID; requestId: string }): DeliveryOrder {
    const draft = repo.getDraft(input.draftId);
    if (!draft) throw new OrderError("NOT_FOUND", "草稿不存在");
    const quote = repo.getQuote(input.quoteId);
    if (!quote) throw new OrderError("QUOTE_EXPIRED", "报价已失效");

    // 幂等：同 requestId 重复提交直接返回
    const existing = repo
      .listOrders()
      .find((o) => o.acceptedQuoteId === quote.id);
    if (existing) return existing;

    if (new Date(quote.expiresAt).getTime() < clock.now().getTime()) {
      throw new OrderError("QUOTE_EXPIRED", "报价已失效，请重新选择车型");
    }
    if (quote.draftRevision !== draft.revision) {
      throw new OrderError("QUOTE_MISMATCH", "草稿与报价版本不一致，请重新选择车型");
    }

    const model = repo.getVehicleModel(quote.vehicleModelId);
    if (!model) throw new OrderError("NOT_FOUND", "车型不存在");

    if (!draft.sender || !draft.receiver || !draft.cargo) {
      throw new OrderError("VALIDATION_ERROR", "草稿信息不完整");
    }
    const compatible = evaluateModelForCargo(model, draft.cargo).ok;
    const dispatchSource = draft.serviceTimeMode === "scheduled" || !compatible
      ? "headquarters" : draft.dispatchSource ?? "nearby";

    const now = clock.nowIso();
    const order: DeliveryOrder = {
      id: identity.newId("order"),
      orderNo: identity.newOrderNo(),
      type: "task_delivery",
      customerId: sessionStore.getCurrentUserId(),
      serviceRegionId: APP_CONFIG.defaultServiceRegionId,
      sender: draft.sender,
      receiver: draft.receiver,
      cargo: draft.cargo,
      serviceTimeMode: draft.serviceTimeMode,
      scheduledPickupAt: draft.scheduledPickupAt,
      vehicleSnapshot: {
        vehicleModelId: model.id,
        modelName: model.name,
        imageUrl: model.imageUrl,
        maxLoadGrams: model.maxLoadGrams,
        cargoVolumeLiters: model.cargoVolumeLiters,
        batteryPercent: undefined,
      },
      acceptedQuoteId: quote.id,
      priceItems: quote.items,
      totalAmountFen: quote.totalAmountFen,
      pricingPolicyId: quote.pricingPolicyId,
      pricingPolicyVersion: quote.pricingPolicyVersion,
      status: dispatchSource === "headquarters" ? "pending_headquarters_review" : "pending_payment",
      dispatchSource,
      headquartersConfirmed: false,
      estimatedPickupAt: undefined,
      estimatedDeliveryAt: undefined,
      createdAt: now,
      updatedAt: now,
    };
    repo.upsertOrder(order);
    pushEvent(order.id, order.status, undefined, "customer", sessionStore.getCurrentUserId(),
      dispatchSource === "headquarters" ? "用户提交总部审核申请" : "用户提交订单");

    // 草稿使命完成，移除
    repo.removeDraft(draft.id);

    return order;
  },

  /** 供后续管理员端调用；客户侧不提供审核入口。 */
  reviewHeadquarters(input: { orderId: ID; reviewerId: ID; decision: "approved" | "rejected"; reason?: string }): DeliveryOrder {
    const order = repo.getOrder(input.orderId);
    if (!order) throw new OrderError("NOT_FOUND", "订单不存在");
    if (order.status !== "pending_headquarters_review" || order.dispatchSource !== "headquarters") {
      throw new OrderError("INVALID_TRANSITION", "当前订单无需总部审核");
    }
    if (!input.reviewerId) throw new OrderError("VALIDATION_ERROR", "缺少审核人");
    if (input.decision === "approved") {
      const model = repo.getVehicleModel(order.vehicleSnapshot.vehicleModelId);
      if (!model) throw new OrderError("NOT_FOUND", "车型不存在");
      const check = evaluateModelForCargo(model, order.cargo);
      if (!check.ok) throw new OrderError("VALIDATION_ERROR", `该车型无法承运：${check.reasons.join("；")}`);
    }
    const reviewed: DeliveryOrder = {
      ...order,
      headquartersConfirmed: input.decision === "approved",
      headquartersReviewReason: input.reason || (input.decision === "rejected" ? "总部未通过运力审核" : undefined),
      headquartersReviewedAt: clock.nowIso(),
      headquartersReviewerId: input.reviewerId,
    };
    repo.upsertOrder(reviewed);
    return transitionOrder(reviewed, input.decision === "approved" ? "pending_payment" : "failed",
      input.reason || (input.decision === "approved" ? "总部确认运力" : "总部审核未通过"), input.reviewerId, "operator");
  },

  /** 预约单到取件前 30 分钟才派车；总部协调中的订单可重试。 */
  dispatchReadyOrder(orderId: ID): DeliveryOrder | undefined {
    const order = repo.getOrder(orderId);
    if (order?.status === "matching" && order.dispatchSource === "headquarters") {
      return this.runDispatch(order);
    }
    if (!order || order.status !== "scheduled" || !order.scheduledPickupAt) return order;
    if (clock.now().getTime() < new Date(order.scheduledPickupAt).getTime() - 30 * 60 * 1000) return order;
    const matching = transitionOrder(order, "matching", "进入预约派车时段");
    return this.runDispatch(matching);
  },

  list(input: { status?: OrderStatus | "active" | "all"; page?: number; pageSize?: number } = {}): DeliveryOrder[] {
    const userId = sessionStore.getCurrentUserId();
    let list = repo.listOrders().filter((o) => o.customerId === userId);
    if (input.status && input.status !== "all") {
      if (input.status === "active") {
        list = list.filter((o) => !["completed", "cancelled", "failed"].includes(o.status));
      } else {
        list = list.filter((o) => o.status === input.status);
      }
    }
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  },

  detail(id: ID): OrderDetailView {
    const order = repo.getOrder(id);
    if (!order) throw new OrderError("NOT_FOUND", "订单不存在");
    if (order.customerId !== sessionStore.getCurrentUserId()) {
      throw new OrderError("FORBIDDEN", "无权访问该订单");
    }
    const events = repo.listOrderEvents(id);
    const payments = repo.listPayments().filter((p) => p.orderId === id);
    const latestPayment = payments.find((p) => p.status === "succeeded")
      ?? payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const refunds = repo.listRefunds().filter((r) => r.orderId === id);
    const allowed = this.computeAllowedActions(order, latestPayment, refunds[0]);

    let assignedVehiclePublic;
    if (order.assignedVehicleId) {
      const v = repo.getVehicle(order.assignedVehicleId);
      const m = v ? repo.getVehicleModel(v.modelId) : undefined;
      if (v && m) {
        assignedVehiclePublic = {
          vehicleId: v.id,
          vehicleNo: v.vehicleNo,
          modelId: m.id,
          modelName: m.name,
          modelImage: m.imageUrl,
          category: m.category,
          batteryPercent: v.batteryPercent ?? 0,
          remainingRangeMeters: v.remainingRangeMeters ?? 0,
          maxLoadGrams: m.maxLoadGrams,
          cargoVolumeLiters: m.cargoVolumeLiters,
          availableTimeRanges: [],
          location: v.location ?? order.sender.location,
          distanceToUserMeters: 0,
          estimatedArrivalMinutes: 0,
          recommended: false,
          recommendationTags: [],
        };
      }
    }

    return {
      order,
      events,
      payment: latestPayment,
      refund: refunds[0],
      allowedActions: allowed,
      assignedVehiclePublic,
    };
  },

  computeAllowedActions(
    order: DeliveryOrder,
    payment?: Payment,
    refund?: Refund,
  ): OrderDetailView["allowedActions"] {
    const acts: OrderDetailView["allowedActions"] = [];
    if (order.status === "pending_payment") {
      acts.push("pay", "cancel");
      if (payment?.status === "failed") acts.push("retry_pay");
    }
    if (order.status === "pending_headquarters_review") acts.push("cancel");
    if (["paid", "scheduled"].includes(order.status)) {
      acts.push("cancel");
      if (order.status === "paid" || !order.scheduledPickupAt ||
        clock.now().getTime() >= new Date(order.scheduledPickupAt).getTime() - 30 * 60 * 1000) acts.push("advance");
    }
    if (order.status === "matching") acts.push("advance");
    if (order.status === "dispatched") acts.push("cancel", "advance");
    if (order.status === "vehicle_to_pickup") acts.push("cancel", "advance");
    if (order.status === "awaiting_loading") acts.push("confirm_loaded", "advance");
    if (order.status === "delivering") acts.push("advance");
    if (order.status === "arrived") acts.push("confirm_received", "advance");
    if (refund?.status === "pending" || refund?.status === "processing") acts.push("advance");
    return acts;
  },

  /** 演示推进：将订单按 nextStatus 推进 */
  advance(input: { orderId: ID }): DeliveryOrder {
    const order = repo.getOrder(input.orderId);
    if (!order) throw new OrderError("NOT_FOUND", "订单不存在");
    if (order.customerId !== sessionStore.getCurrentUserId()) {
      throw new OrderError("FORBIDDEN", "无权操作");
    }

    const flow: Record<OrderStatus, OrderStatus> = {
      pending_headquarters_review: "pending_headquarters_review",
      pending_dispatch_review: "pending_dispatch_review",
      pending_customer_quote: "pending_customer_quote",
      pending_payment: "paid",
      paid: "matching",
      scheduled: "matching",
      matching: "dispatched",
      dispatched: "vehicle_to_pickup",
      vehicle_to_pickup: "awaiting_loading",
      awaiting_loading: "delivering",
      delivering: "arrived",
      arrived: "completed",
      completed: "completed",
      cancelled: "cancelled",
      failed: "failed",
    };

    if (order.status === "pending_headquarters_review") return order;
    if (order.status === "pending_payment") {
      const paid = transitionOrder(order, "paid", "支付成功");
      return paid.serviceTimeMode === "scheduled" ? transitionOrder(paid, "scheduled", "预约待派车") : paid;
    }
    if (order.status === "scheduled") return this.dispatchReadyOrder(order.id) ?? order;
    // paid 状态需要先做一次自动匹配
    if (order.status === "paid") {
      // 触发调度
      const scheduled = this.tryMatch(order);
      if (scheduled.status === "failed") {
        // 匹配失败：创建退款
        return scheduled;
      }
      const updated = transitionOrder(order, "matching", "调度启动");
      return this.runDispatch(updated);
    }

    if (order.status === "matching") return this.runDispatch(order);

    const next = flow[order.status];
    if (!next || next === order.status) return order;
    return transitionOrder(order, next, "演示推进");
  },

  tryMatch(order: DeliveryOrder): DeliveryOrder {
    if (order.dispatchSource === "headquarters") return order;
    // 构造 OrderDraft 仅供调度使用
    const draft = {
      id: order.id,
      userId: order.customerId,
      revision: 1,
      sender: order.sender,
      receiver: order.receiver,
      serviceTimeMode: order.serviceTimeMode,
      scheduledPickupAt: order.scheduledPickupAt,
      cargo: order.cargo,
      selectedVehicleModelId: order.vehicleSnapshot.vehicleModelId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    } as any;

    const models = new Map(repo.listVehicleModels().map((m) => [m.id, m]));
    const rules = new Map(repo.listAvailabilityRules().map((r) => [r.vehicleId, r]));
    const pick = pickDispatchedVehicle(
      repo.listVehicles(),
      models,
      draft,
      rules,
      clock.now(),
    );

    if (!pick) {
      // 匹配失败：标记订单失败 + 创建全额退款
      const failed = transitionOrder(order, "failed", "无符合条件车辆");
      this.refundForOrder(order, "匹配失败退款");
      return failed;
    }
    return order;
  },

  /** 真正执行匹配 → 占用车辆 → dispatched */
  runDispatch(order: DeliveryOrder): DeliveryOrder {
    if (order.status !== "matching") return order;
    const draft = {
      id: order.id,
      userId: order.customerId,
      revision: 1,
      sender: order.sender,
      receiver: order.receiver,
      serviceTimeMode: order.serviceTimeMode,
      scheduledPickupAt: undefined,
      cargo: order.cargo,
      selectedVehicleModelId: order.vehicleSnapshot.vehicleModelId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    } as any;
    const models = new Map(repo.listVehicleModels().map((m) => [m.id, m]));
    const rules = new Map(repo.listAvailabilityRules().map((r) => [r.vehicleId, r]));
    const pick = pickDispatchedVehicle(
      repo.listVehicles(),
      models,
      draft,
      rules,
      clock.now(),
    );
    if (!pick) {
      if (order.dispatchSource === "headquarters") return order;
      const failed = transitionOrder(order, "failed", "无可用车辆");
      this.refundForOrder(order, "无车退款");
      return failed;
    }
    // 占用车辆
    const v: Vehicle = { ...pick.vehicle, status: "vehicle_to_pickup", currentOrderId: order.id };
    repo.upsertVehicle(v);

    // 写 DispatchRecord
    const rec: DispatchRecord = {
      id: identity.newId("disp"),
      orderId: order.id,
      vehicleId: v.id,
      status: "assigned",
      distanceToPickupMeters: pick.distance,
      estimatedArrivalMinutes: Math.max(3, Math.round((pick.distance / 1000 / 30) * 60)),
      decidedAt: clock.nowIso(),
      createdAt: clock.nowIso(),
      updatedAt: clock.nowIso(),
    };
    repo.upsertDispatchRecord(rec);

    const updatedOrder: DeliveryOrder = {
      ...order,
      assignedVehicleId: v.id,
      vehicleSnapshot: {
        ...order.vehicleSnapshot,
        vehicleId: v.id,
        vehicleNo: v.vehicleNo,
        batteryPercent: v.batteryPercent,
      },
      estimatedPickupAt: clock.now().toISOString(),
      estimatedDeliveryAt: new Date(clock.now().getTime() + 25 * 60 * 1000).toISOString(),
    };
    repo.upsertOrder(updatedOrder);

    return transitionOrder(updatedOrder, "dispatched", `已分配 ${v.vehicleNo}`);
  },

  /** 用户取消订单 */
  cancel(input: { orderId: ID; reason: string; expectedVersion?: number }): DeliveryOrder {
    const order = repo.getOrder(input.orderId);
    if (!order) throw new OrderError("NOT_FOUND", "订单不存在");
    if (order.customerId !== sessionStore.getCurrentUserId()) {
      throw new OrderError("FORBIDDEN", "无权操作");
    }
    if (!isUserCancelable(order.status)) {
      throw new OrderError("INVALID_TRANSITION", "当前状态不可取消");
    }

    // 释放车辆占用（仅当已分配）
    if (order.assignedVehicleId) {
      const v = repo.getVehicle(order.assignedVehicleId);
      if (v && v.currentOrderId === order.id) {
        repo.upsertVehicle({ ...v, status: "available", currentOrderId: undefined });
      }
    }

    const cancelled = transitionOrder(order, "cancelled", input.reason, sessionStore.getCurrentUserId());
    cancelled.cancellationReason = input.reason;
    repo.upsertOrder(cancelled);

    // 支付成功过的订单创建退款
    const payment = repo.listPayments().find((p) => p.orderId === order.id);
    if (payment && payment.status === "succeeded") {
      this.refundForOrder(cancelled, input.reason, payment);
    }
    return cancelled;
  },

  refundForOrder(order: DeliveryOrder, reason: string, payment?: Payment): Refund {
    const pay = payment || repo.listPayments().find((p) => p.orderId === order.id);
    if (!pay) {
      // 无支付：直接写 pending 退款即可（占位）
      const r: Refund = {
        id: identity.newId("refund"),
        refundNo: identity.newRefundNo(),
        orderId: order.id,
        paymentId: "",
        amountFen: order.totalAmountFen,
        reason,
        status: "pending",
        createdAt: clock.nowIso(),
        updatedAt: clock.nowIso(),
      };
      repo.upsertRefund(r);
      return r;
    }
    const r: Refund = {
      id: identity.newId("refund"),
      refundNo: identity.newRefundNo(),
      orderId: order.id,
      paymentId: pay.id,
      amountFen: pay.amountFen,
      reason,
      status: "pending",
      createdAt: clock.nowIso(),
      updatedAt: clock.nowIso(),
    };
    repo.upsertRefund(r);

    // 模拟立刻成功（Mock）
    setTimeout(() => {
      const updated: Refund = { ...r, status: "succeeded", completedAt: clock.nowIso(), updatedAt: clock.nowIso() };
      repo.upsertRefund(updated);
    }, 0);
    return r;
  },

  /** 推进 refund 状态（演示用） */
  advanceRefund(refundId: ID): Refund {
    const r = repo.listRefunds().find((x) => x.id === refundId);
    if (!r) throw new OrderError("NOT_FOUND", "退款记录不存在");
    if (r.status === "pending") {
      const updated: Refund = { ...r, status: "processing", updatedAt: clock.nowIso() };
      repo.upsertRefund(updated);
      return updated;
    }
    if (r.status === "processing") {
      const updated: Refund = { ...r, status: "succeeded", completedAt: clock.nowIso(), updatedAt: clock.nowIso() };
      repo.upsertRefund(updated);
      return updated;
    }
    return r;
  },

  /** 用户确认装货完成 */
  confirmLoaded(orderId: ID): DeliveryOrder {
    const order = repo.getOrder(orderId);
    if (!order) throw new OrderError("NOT_FOUND", "订单不存在");
    if (order.status !== "awaiting_loading") {
      throw new OrderError("INVALID_TRANSITION", "当前状态不允许确认装货");
    }
    const updated = transitionOrder(order, "delivering", "用户确认装货");
    // 推进车辆状态
    if (updated.assignedVehicleId) {
      const v = repo.getVehicle(updated.assignedVehicleId);
      if (v) repo.upsertVehicle({ ...v, status: "delivering" });
    }
    return updated;
  },

  /** 用户确认收货 */
  confirmReceived(orderId: ID): DeliveryOrder {
    const order = repo.getOrder(orderId);
    if (!order) throw new OrderError("NOT_FOUND", "订单不存在");
    if (order.status !== "arrived") {
      throw new OrderError("INVALID_TRANSITION", "当前状态不允许确认收货");
    }

    const completed = transitionOrder(order, "completed", "用户确认收货");

    // 释放车辆
    if (completed.assignedVehicleId) {
      const v = repo.getVehicle(completed.assignedVehicleId);
      if (v && v.currentOrderId === completed.id) {
        repo.upsertVehicle({ ...v, status: "available", currentOrderId: undefined });
      }
    }

    // 生成一次分润
    this.settleRevenue(completed);

    return completed;
  },

  settleRevenue(order: DeliveryOrder): void {
    const existing = repo.listAllocations().filter((a) => a.orderId === order.id);
    if (existing.length > 0) return; // 幂等
    const rule = repo.getDefaultSharingRule();
    if (!rule) return;
    const result = allocateRevenue(order.totalAmountFen, rule.shares);
    for (const item of result.items) {
      const recipientId =
        item.recipientType === "vehicle_owner"
          ? (order.assignedVehicleId ? repo.getVehicle(order.assignedVehicleId)?.ownerId : undefined) ?? sessionStore.getCurrentOwnerId()
          : item.recipientType === "platform"
          ? "platform"
          : APP_CONFIG.defaultServiceRegionId;
      repo.upsertAllocation({
        id: identity.newId("alloc"),
        orderId: order.id,
        revenueSharingRuleId: rule.id,
        recipientType: item.recipientType,
        recipientId,
        amountFen: item.amountFen,
        ruleVersion: rule.version,
        status: "settled",
        settledAt: clock.nowIso(),
        createdAt: clock.nowIso(),
        updatedAt: clock.nowIso(),
      });
    }
  },
};
