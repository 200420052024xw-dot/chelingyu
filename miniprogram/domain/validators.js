"use strict";
/** 运行时校验函数 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMoneyFen = validateMoneyFen;
exports.validatePositiveInteger = validatePositiveInteger;
exports.validateAddress = validateAddress;
exports.validateCargo = validateCargo;
exports.validateDraftForQuote = validateDraftForQuote;
exports.validatePriceItems = validatePriceItems;
exports.validateWeeklyTimeRange = validateWeeklyTimeRange;
exports.sumPriceItems = sumPriceItems;
function validateMoneyFen(value, field) {
    const issues = [];
    if (typeof value !== "number" || !Number.isInteger(value)) {
        issues.push({ field, message: "金额必须为整数（分）" });
    }
    else if (value < 0) {
        issues.push({ field, message: "金额不能为负" });
    }
    return issues;
}
function validatePositiveInteger(value, field) {
    const issues = [];
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
        issues.push({ field, message: `${field} 必须为正整数` });
    }
    return issues;
}
function validateAddress(snap, field) {
    var _a, _b;
    const issues = [];
    if (!snap) {
        issues.push({ field, message: "请选择地址" });
        return issues;
    }
    if (!snap.name)
        issues.push({ field: `${field}.name`, message: "请填写地址名称" });
    if (!snap.contactName)
        issues.push({ field: `${field}.contactName`, message: "请填写联系人" });
    if (!/^\d{11}$|^\d{3}\*+\d{4}$/.test(snap.contactMobile)) {
        issues.push({ field: `${field}.contactMobile`, message: "联系人手机号格式不正确" });
    }
    if (!snap.detail)
        issues.push({ field: `${field}.detail`, message: "请填写详细地址" });
    if (typeof ((_a = snap.location) === null || _a === void 0 ? void 0 : _a.latitude) !== "number" ||
        typeof ((_b = snap.location) === null || _b === void 0 ? void 0 : _b.longitude) !== "number") {
        issues.push({ field: `${field}.location`, message: "缺少经纬度" });
    }
    return issues;
}
function validateCargo(cargo) {
    const issues = [];
    if (!cargo) {
        issues.push({ field: "cargo", message: "请填写货物信息" });
        return issues;
    }
    if (!cargo.description)
        issues.push({ field: "cargo.description", message: "请填写货物说明" });
    if (cargo.quantity <= 0 || !Number.isInteger(cargo.quantity)) {
        issues.push({ field: "cargo.quantity", message: "数量必须为正整数" });
    }
    if (cargo.unitWeightGrams !== undefined) {
        issues.push(...validatePositiveInteger(cargo.unitWeightGrams, "cargo.unitWeightGrams"));
    }
    if (cargo.needsHandling) {
        issues.push({ field: "cargo.needsHandling", message: "当前版本暂不支持需要搬运，请取消勾选" });
    }
    return issues;
}
function validateDraftForQuote(draft) {
    const issues = [];
    issues.push(...validateAddress(draft.sender, "sender"));
    issues.push(...validateAddress(draft.receiver, "receiver"));
    issues.push(...validateCargo(draft.cargo));
    if (draft.serviceTimeMode === "scheduled" && !draft.scheduledPickupAt) {
        issues.push({ field: "scheduledPickupAt", message: "请选择预约取件时间" });
    }
    return issues;
}
function validatePriceItems(items) {
    const issues = [];
    if (!items.length) {
        issues.push({ field: "items", message: "价格明细不能为空" });
    }
    for (const item of items) {
        issues.push(...validateMoneyFen(item.amountFen, `items.${item.type}`));
    }
    return issues;
}
function validateWeeklyTimeRange(r) {
    var _a;
    const issues = [];
    if (!((_a = r.weekdays) === null || _a === void 0 ? void 0 : _a.length))
        issues.push({ field: "weekdays", message: "请选择生效星期" });
    if (!/^\d{2}:\d{2}$/.test(r.startTime) || !/^\d{2}:\d{2}$/.test(r.endTime)) {
        issues.push({ field: "time", message: "时间格式为 HH:mm" });
    }
    else if (r.startTime >= r.endTime) {
        issues.push({ field: "time", message: "起始时间需早于结束时间" });
    }
    return issues;
}
/** 合计金额计算 */
function sumPriceItems(items) {
    return items.reduce((s, i) => s + i.amountFen, 0);
}
