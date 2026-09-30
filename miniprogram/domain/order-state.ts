/** 订单状态机：定义允许的状态迁移与幂等规则。 */

import type { OrderStatus, ServiceError } from "../contracts/types";

/** 合法迁移：from -> [to, ...] */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["scheduled", "matching", "cancelled"],
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

export const ACTIVE_STATUSES: OrderStatus[] = [
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

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: OrderStatus, to: OrderStatus): ServiceError | null {
  if (from === to) return null;
  if (!canTransition(from, to)) {
    return {
      code: "INVALID_TRANSITION",
      message: `订单状态不允许从 ${from} 迁移到 ${to}`,
      retryable: false,
    };
  }
  return null;
}

export function isTerminal(status: OrderStatus): boolean {
  return ["completed", "cancelled", "failed"].includes(status);
}

/** 用户侧可主动操作的取消窗口 */
export function isUserCancelable(status: OrderStatus): boolean {
  return ["pending_payment", "paid", "scheduled", "matching", "dispatched", "vehicle_to_pickup"].includes(
    status,
  );
}

/** 是否允许用户推进（演示） */
export function isAdvanceable(status: OrderStatus): boolean {
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
