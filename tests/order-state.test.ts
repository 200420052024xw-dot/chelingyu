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
import type { OrderStatus } from "../miniprogram/contracts/types";

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
assert(!isAdvanceable("completed"), "completed 不可推进（终态）");
assert(!isAdvanceable("cancelled"), "cancelled 不可推进（终态）");

console.log("\n[order-state] ACTIVE_STATUSES");
const expected: OrderStatus[] = [
  "pending_payment", "paid", "scheduled", "matching", "dispatched",
  "vehicle_to_pickup", "awaiting_loading", "delivering", "arrived",
];
assert(ACTIVE_STATUSES.length === expected.length, "活跃状态数量正确");
assert(ACTIVE_STATUSES.every((s) => expected.includes(s)), "活跃状态枚举一致");

console.log(`\n共 ${pass + fail} 用例：通过 ${pass}，失败 ${fail}`);
process.exit(fail === 0 ? 0 : 1);
