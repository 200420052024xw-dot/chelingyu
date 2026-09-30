/** Cargo & Vehicle formatting */

import type { CargoInfo, VehicleCategory, WeeklyTimeRange } from "../contracts/types";

export function formatWeight(grams: number | undefined): string {
  if (grams === undefined) return "";
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`;
  return `${grams} g`;
}

export function formatVolume(l: number): string {
  if (l >= 1000) return `${(l / 1000).toFixed(1)} m³`;
  return `${l} L`;
}

export function formatDimensions(d: { length: number; width: number; height: number } | undefined): string {
  if (!d) return "";
  return `${d.length} × ${d.width} × ${d.height} mm`;
}

export const CARGO_LABELS: Record<CargoInfo["category"], string> = {
  general: "普通货物",
  document: "文件票据",
  fresh_cold_chain: "生鲜冷链",
  food: "餐饮食品",
  medical: "医药用品",
  other: "其他",
};

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  box_small: "小型厢式",
  box_medium: "中型厢式",
  cold_chain: "冷链车型",
  special: "特殊车型",
};

export function formatTimeRanges(ranges: WeeklyTimeRange[] | undefined): string {
  if (!ranges?.length) return "未设置";
  const days = ["一", "二", "三", "四", "五", "六", "日"];
  const items = ranges.map((r) => {
    const wd = r.weekdays.map((d) => days[d - 1]).join("/");
    return `${wd} ${r.startTime}-${r.endTime}`;
  });
  return items.join("，");
}
