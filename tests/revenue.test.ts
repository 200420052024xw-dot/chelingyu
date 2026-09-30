/**
 * 分账单元测试
 * 运行：npx ts-node tests/revenue.test.ts
 */

import { allocateRevenue } from "../miniprogram/domain/revenue";
import type { RevenueShareItem } from "../miniprogram/contracts/types";

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

console.log("\n[revenue] 简单 1:1 分账");
{
  const shares: RevenueShareItem[] = [
    { recipientType: "owner", basisPoints: 5000 },
    { recipientType: "platform", basisPoints: 5000 },
  ];
  const r = allocateRevenue(1000, shares);
  assert(r.totalAllocated === 1000, "总额守恒 = 1000");
  assert(r.items[0].amountFen === 500, "车主 500");
  assert(r.items[1].amountFen === 500, "平台 500");
}

console.log("\n[revenue] 7:3 分账（整除）");
{
  const shares: RevenueShareItem[] = [
    { recipientType: "owner", basisPoints: 7000 },
    { recipientType: "platform", basisPoints: 3000 },
  ];
  const r = allocateRevenue(1000, shares);
  assert(r.totalAllocated === 1000, "总额守恒 = 1000");
  assert(r.items.find((i) => i.recipientType === "owner")!.amountFen === 700, "车主 700");
  assert(r.items.find((i) => i.recipientType === "platform")!.amountFen === 300, "平台 300");
}

console.log("\n[revenue] 3 人均分 + 余分");
{
  const shares: RevenueShareItem[] = [
    { recipientType: "owner", basisPoints: 3334 },
    { recipientType: "operator", basisPoints: 3333 },
    { recipientType: "platform", basisPoints: 3333 },
  ];
  const r = allocateRevenue(100, shares);
  assert(r.totalAllocated === 100, "总额守恒 = 100");
  // 整数分：33+33+33 = 99，余 1 分给余数最大的（owner）
  assert(r.items.find((i) => i.recipientType === "owner")!.amountFen === 34, "owner 拿余分 34");
  assert(r.items.filter((i) => i.recipientType !== "owner").every((i) => i.amountFen === 33), "其他各 33");
}

console.log("\n[revenue] 极端：100% 一方");
{
  const shares: RevenueShareItem[] = [
    { recipientType: "owner", basisPoints: 10000 },
  ];
  const r = allocateRevenue(777, shares);
  assert(r.totalAllocated === 777, "总额守恒");
  assert(r.items[0].amountFen === 777, "owner 拿全部 777");
}

console.log("\n[revenue] 空分账规则");
{
  const r = allocateRevenue(500, []);
  assert(r.totalAllocated === 0, "无规则时分配为 0");
  assert(r.totalAvailable === 500, "可用金额保留为 500");
}

console.log("\n[revenue] 0 元订单");
{
  const shares: RevenueShareItem[] = [
    { recipientType: "owner", basisPoints: 5000 },
    { recipientType: "platform", basisPoints: 5000 },
  ];
  const r = allocateRevenue(0, shares);
  assert(r.totalAllocated === 0, "0 总额");
  assert(r.items.every((i) => i.amountFen === 0), "各方 0");
}

console.log("\n[revenue] 总和不等于 10000（按比例分配后余数回收）");
{
  // 故意设置 bp 之和 < 10000：6000 + 3000 = 9000
  const shares: RevenueShareItem[] = [
    { recipientType: "owner", basisPoints: 6000 },
    { recipientType: "platform", basisPoints: 3000 },
  ];
  const r = allocateRevenue(1000, shares);
  // floor 分配：600 + 300 = 900，剩 100 分
  // platform 比例 = 0.3（fraction=0.0），owner 比例 = 0.6（fraction=0.0）
  // 余分按小数余数相同时按 bp asc：platform(3000) 先拿，最终 platform=301, owner=601
  assert(r.totalAllocated === 1000, "余分回收后总额守恒");
  assert(r.items.find((i) => i.recipientType === "owner")!.amountFen === 601, "owner = 601（+1 余分）");
  assert(r.items.find((i) => i.recipientType === "platform")!.amountFen === 301, "platform = 301（+1 余分）");
}

console.log(`\n共 ${pass + fail} 用例：通过 ${pass}，失败 ${fail}`);
process.exit(fail === 0 ? 0 : 1);
