/** 时钟适配层。所有"当前时间"必须经过此处，便于演示推进。 */

export interface Clock {
  now(): Date;
  nowIso(): string;
}

let overrideNow: Date | null = null;

export const clock: Clock = {
  now(): Date {
    return overrideNow ? new Date(overrideNow) : new Date();
  },
  nowIso(): string {
    return this.now().toISOString();
  },
};

/** 演示推进：将系统时间向前推进 N 分钟。 */
export function advanceDemoClock(minutes: number): void {
  const base = overrideNow ?? new Date();
  overrideNow = new Date(base.getTime() + minutes * 60 * 1000);
}

/** 重置演示时钟。 */
export function resetDemoClock(): void {
  overrideNow = null;
}

/** 获取当前覆盖时钟（无则返回 null）。 */
export function getOverrideNow(): Date | null {
  return overrideNow ? new Date(overrideNow) : null;
}

/** 获取覆盖时钟的展示文案；无覆盖返回空串。 */
export function getOverrideLabel(): string {
  if (!overrideNow) return "";
  return formatDateTime(overrideNow);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${Y}-${M}-${D} ${h}:${m}`;
}

export function formatRelativeMinutes(target: string | Date): string {
  const d = typeof target === "string" ? new Date(target) : target;
  const diffMs = d.getTime() - clock.now().getTime();
  const min = Math.round(diffMs / 60000);
  if (min <= 0) return "即将";
  if (min < 60) return `${min} 分钟`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h} 小时${m > 0 ? ` ${m} 分钟` : ""}`;
}
