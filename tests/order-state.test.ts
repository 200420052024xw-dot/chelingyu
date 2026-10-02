/**
 * 订单状态机单元测试
 * 运行：npx ts-node tests/order-state.test.ts
 */

import {
  canTransition,
  assertTransition,
  isTerminal,
  isUserCancelable,
  isAdvanceable,
  ACTIVE_STATUSES,
} from "../miniprogram/domain/order-state";
import type { OrderStatus, OrderStatusEvent } from "../miniprogram/contracts/types";
import { customerOrderStage, statusBadge } from "../miniprogram/view-models/order";

let pass = 0;
let fail = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    pass++;
    console.log("  ✓", msg);
  } else {
    fail++;
    console.log("  ✗", msg);
  }
}

console.log("\n[order-state] canTransition 合法迁移");
assert(canTransition("pending_headquarters_review", "pending_payment"), "总部审核通过 → 待支付");
assert(canTransition("pending_headquarters_review", "failed"), "总部审核拒绝 → 失败");
assert(canTransition("pending_dispatch_review", "pending_payment"), "平台调度通过 → 待支付");
assert(canTransition("pending_dispatch_review", "pending_customer_quote"), "平台建议新车型 → 待客户确认");
assert(canTransition("pending_customer_quote", "pending_payment"), "客户确认新报价 → 待支付");
assert(canTransition("pending_payment", "paid"), "待支付 → 已支付");
assert(canTransition("pending_payment", "cancelled"), "待支付 → 已取消");
assert(canTransition("paid", "matching"), "已支付 → 撮合中");
assert(canTransition("matching", "dispatched"), "撮合中 → 已派单");
assert(canTransition("dispatched", "vehicle_to_pickup"), "已派单 → 前往取货");
assert(canTransition("vehicle_to_pickup", "awaiting_loading"), "前往取货 → 待装货");
assert(canTransition("awaiting_loading", "delivering"), "待装货 → 运输中");
assert(canTransition("delivering", "arrived"), "运输中 → 已到达");
assert(canTransition("arrived", "completed"), "已到达 → 已完成");

console.log("\n[order-state] canTransition 非法迁移");
assert(!canTransition("pending_headquarters_review", "paid"), "待总部审核不能直接支付");
assert(!canTransition("pending_payment", "completed"), "待支付不可直接完成");
assert(!canTransition("completed", "cancelled"), "已完成不可取消");
assert(!canTransition("cancelled", "paid"), "已取消不可恢复");
assert(!canTransition("delivering", "pending_payment"), "运输中不可回到待支付");
assert(!canTransition("arrived", "cancelled"), "已到达不可再取消");

console.log("\n[order-state] assertTransition");
const err1 = assertTransition("pending_payment", "completed");
assert(err1 !== null && err1.code === "INVALID_TRANSITION", "非法迁移返回错误");
const err2 = assertTransition("paid", "matching");
assert(err2 === null, "合法迁移返回 null");
const err3 = assertTransition("paid", "paid");
assert(err3 === null, "同状态返回 null（幂等）");

console.log("\n[order-state] isTerminal");
assert(isTerminal("completed"), "completed 终态");
assert(isTerminal("cancelled"), "cancelled 终态");
assert(isTerminal("failed"), "failed 终态");
assert(!isTerminal("paid"), "paid 非终态");
assert(!isTerminal("delivering"), "delivering 非终态");

console.log("\n[order-state] isUserCancelable");
assert(isUserCancelable("pending_payment"), "待支付可取消");
assert(isUserCancelable("pending_headquarters_review"), "待总部审核可取消");
assert(isUserCancelable("vehicle_to_pickup"), "前往取货可取消");
assert(!isUserCancelable("awaiting_loading"), "待装货不可取消（车已到）");
assert(!isUserCancelable("delivering"), "运输中不可取消");
assert(!isUserCancelable("arrived"), "已到达不可取消");
assert(!isUserCancelable("completed"), "已完成不可取消");
assert(!isUserCancelable("cancelled"), "已取消不可再取消");

console.log("\n[order-state] isAdvanceable");
assert(isAdvanceable("paid"), "paid 可推进");
assert(isAdvanceable("delivering"), "delivering 可推进");
assert(isAdvanceable("arrived"), "arrived 可推进");
assert(!isAdvanceable("pending_payment"), "pending_payment 不可推进（未支付）");
assert(!isAdvanceable("pending_headquarters_review"), "待总部审核不可推进");
assert(!isAdvanceable("completed"), "completed 不可推进（终态）");
assert(!isAdvanceable("cancelled"), "cancelled 不可推进（终态）");

console.log("\n[order-state] ACTIVE_STATUSES");
const expected: OrderStatus[] = [
  "pending_headquarters_review", "pending_dispatch_review", "pending_customer_quote", "pending_payment", "paid", "scheduled", "matching", "dispatched",
  "vehicle_to_pickup", "awaiting_loading", "delivering", "arrived",
];
assert(ACTIVE_STATUSES.length === expected.length, "活跃状态数量正确");
assert(ACTIVE_STATUSES.every((s) => expected.includes(s)), "活跃状态枚举一致");

console.log("\n[order-state] 用户侧状态与五段进度");
const customerStatuses: Array<[OrderStatus, string, number]> = [
  ["pending_headquarters_review", "审核中", 0],
  ["pending_dispatch_review", "审核中", 0],
  ["pending_customer_quote", "待确认报价", 0],
  ["pending_payment", "待支付", 1],
  ["paid", "待派车", 2],
  ["scheduled", "待派车", 2],
  ["matching", "待派车", 2],
  ["dispatched", "取件中", 2],
  ["vehicle_to_pickup", "取件中", 2],
  ["awaiting_loading", "待确认装货", 2],
  ["delivering", "配送中", 3],
  ["arrived", "待收货", 3],
  ["completed", "已完成", 4],
  ["cancelled", "已取消", 0],
  ["failed", "异常结束", 0],
];
assert(customerStatuses.every(([status, label, stage]) => statusBadge(status).text === label && customerOrderStage(status) === stage), "全部内部状态映射到预期主状态和阶段");
assert(new Set(customerStatuses.map(([status]) => statusBadge(status).text)).size === 11, "用户侧仅有 11 个主状态");
const event = (toStatus: OrderStatus, occurredAt: string): OrderStatusEvent => ({
  id: `${toStatus}-${occurredAt}`, orderId: "order-1", toStatus, actorType: "system",
  createdAt: occurredAt, updatedAt: occurredAt, occurredAt,
});
assert(customerOrderStage("cancelled", [event("pending_payment", "2026-01-01T10:00:00Z"), event("cancelled", "2026-01-01T10:01:00Z")]) === 1, "取消订单停在最后已到达阶段");
assert(customerOrderStage("failed", [event("failed", "2026-01-01T10:01:00Z"), event("matching", "2026-01-01T10:00:00Z")]) === 2, "异常订单依据事件时间停在最后已到达阶段");

console.log(`\n共 ${pass + fail} 用例：通过 ${pass}，失败 ${fail}`);
process.exit(fail === 0 ? 0 : 1);
