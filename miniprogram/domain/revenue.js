"use strict";
/** 分润计算：合计 = 可分配金额，按万分比取整，余分按小数余数从大到小分配。 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.allocateRevenue = allocateRevenue;
function allocateRevenue(totalFen, shares) {
    if (shares.length === 0)
        return { items: [], totalAllocated: 0, totalAvailable: totalFen };
    // 整数分 = floor(total * bp / 10000)，fractional 用于余分分配
    const pre = shares.map((s) => {
        const exact = (totalFen * s.basisPoints) / 10000;
        return {
            recipientType: s.recipientType,
            floor: Math.floor(exact),
            fraction: exact - Math.floor(exact),
            bp: s.basisPoints,
        };
    });
    let allocated = pre.reduce((s, p) => s + p.floor, 0);
    let remainder = totalFen - allocated;
    // 余分按小数余数从大到小补给，余数相同时按 bp 从小到大（避免大额者多次拿走余分）
    const order = [...pre].sort((a, b) => b.fraction - a.fraction || a.bp - b.bp);
    for (const o of order) {
        if (remainder <= 0)
            break;
        o.floor += 1;
        remainder -= 1;
    }
    return {
        items: order.map((o) => ({ recipientType: o.recipientType, amountFen: o.floor })),
        totalAllocated: totalFen,
        totalAvailable: totalFen,
    };
}
