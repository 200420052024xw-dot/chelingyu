"use strict";
/** Cargo & Vehicle formatting */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VEHICLE_CATEGORY_LABELS = exports.CARGO_LABELS = void 0;
exports.formatWeight = formatWeight;
exports.formatVolume = formatVolume;
exports.formatDimensions = formatDimensions;
exports.formatTimeRanges = formatTimeRanges;
function formatWeight(grams) {
    if (grams === undefined)
        return "";
    if (grams >= 1000)
        return `${(grams / 1000).toFixed(1)} kg`;
    return `${grams} g`;
}
function formatVolume(l) {
    if (l >= 1000)
        return `${(l / 1000).toFixed(1)} m³`;
    return `${l} L`;
}
function formatDimensions(d) {
    if (!d)
        return "";
    return `${d.length} × ${d.width} × ${d.height} mm`;
}
exports.CARGO_LABELS = {
    general: "普通货物",
    document: "文件票据",
    fresh_cold_chain: "生鲜冷链",
    food: "餐饮食品",
    medical: "医药用品",
    other: "其他",
};
exports.VEHICLE_CATEGORY_LABELS = {
    box_small: "小型厢式",
    box_medium: "中型厢式",
    cold_chain: "冷链车型",
    special: "特殊车型",
};
function formatTimeRanges(ranges) {
    if (!(ranges === null || ranges === void 0 ? void 0 : ranges.length))
        return "未设置";
    const days = ["一", "二", "三", "四", "五", "六", "日"];
    const items = ranges.map((r) => {
        const wd = r.weekdays.map((d) => days[d - 1]).join("/");
        return `${wd} ${r.startTime}-${r.endTime}`;
    });
    return items.join("，");
}
