"use strict";
/** 时钟适配层。所有"当前时间"必须经过此处，便于演示推进。 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clock = void 0;
exports.advanceDemoClock = advanceDemoClock;
exports.resetDemoClock = resetDemoClock;
exports.getOverrideNow = getOverrideNow;
exports.getOverrideLabel = getOverrideLabel;
exports.formatTime = formatTime;
exports.formatDateTime = formatDateTime;
exports.formatRelativeMinutes = formatRelativeMinutes;
let overrideNow = null;
exports.clock = {
    now() {
        return overrideNow ? new Date(overrideNow) : new Date();
    },
    nowIso() {
        return this.now().toISOString();
    },
};
/** 演示推进：将系统时间向前推进 N 分钟。 */
function advanceDemoClock(minutes) {
    const base = overrideNow !== null && overrideNow !== void 0 ? overrideNow : new Date();
    overrideNow = new Date(base.getTime() + minutes * 60 * 1000);
}
/** 重置演示时钟。 */
function resetDemoClock() {
    overrideNow = null;
}
/** 获取当前覆盖时钟（无则返回 null）。 */
function getOverrideNow() {
    return overrideNow ? new Date(overrideNow) : null;
}
/** 获取覆盖时钟的展示文案；无覆盖返回空串。 */
function getOverrideLabel() {
    if (!overrideNow)
        return "";
    return formatDateTime(overrideNow);
}
function formatTime(date) {
    const d = typeof date === "string" ? new Date(date) : date;
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
}
function formatDateTime(date) {
    const d = typeof date === "string" ? new Date(date) : date;
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, "0");
    const D = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${Y}-${M}-${D} ${h}:${m}`;
}
function formatRelativeMinutes(target) {
    const d = typeof target === "string" ? new Date(target) : target;
    const diffMs = d.getTime() - exports.clock.now().getTime();
    const min = Math.round(diffMs / 60000);
    if (min <= 0)
        return "即将";
    if (min < 60)
        return `${min} 分钟`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h} 小时${m > 0 ? ` ${m} 分钟` : ""}`;
}
