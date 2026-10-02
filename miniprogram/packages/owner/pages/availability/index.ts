import { withPagePerformance } from "../../../../utils/page-performance";
import type { WeeklyTimeRange } from "../../../../contracts/types";
import { ownerService } from "../../../../services/owner";
import { repo } from "../../../../repositories/index";
import { isSharedMode, sharedFleet } from "../../../../services/remote";

interface PageData {
  vehicleId: string;
  ownerShared: boolean;
  ruleEnabled: boolean;
  weekdayEnabled: Array<boolean>;
  startTime: string;
  endTime: string;
  saving: boolean;
  error: string;
}

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

Page<PageData, any>(withPagePerformance<PageData, any>("packages/owner/pages/availability/index", {
  data: {
    vehicleId: "",
    ownerShared: true,
    ruleEnabled: true,
    weekdayEnabled: [true, true, true, true, true, true, true],
    startTime: "08:00",
    endTime: "22:00",
    saving: false,
    error: "",
  },

  async onLoad(query) {
    const id = query?.id as string;
    this.setData({ vehicleId: id });
    const detail = isSharedMode() ? await sharedFleet.ownerVehicle(id) : ownerService.vehicleDetail(id);
    if (detail.rule) {
      const r = detail.rule.ranges[0] || { weekdays: ALL_WEEKDAYS, startTime: "08:00", endTime: "22:00" };
      this.setData({
        ruleEnabled: detail.rule.enabled,
        ownerShared: detail.vehicle.ownerShared,
        weekdayEnabled: ALL_WEEKDAYS.map((d) => r.weekdays.includes(d as any)),
        startTime: r.startTime,
        endTime: r.endTime,
      });
    } else {
      this.setData({ ownerShared: detail.vehicle.ownerShared });
    }
  },

  onToggleShare() {
    this.setData({ ownerShared: !this.data.ownerShared });
  },

  onToggleRule() {
    this.setData({ ruleEnabled: !this.data.ruleEnabled });
  },

  onToggleDay(e: any) {
    const idx = Number(e.currentTarget.dataset.idx);
    const next = [...this.data.weekdayEnabled];
    next[idx] = !next[idx];
    this.setData({ weekdayEnabled: next });
  },

  onPickStart(e: any) {
    this.setData({ startTime: e.detail.value });
  },

  onPickEnd(e: any) {
    this.setData({ endTime: e.detail.value });
  },

  async onSave() {
    if (this.data.startTime >= this.data.endTime) {
      this.setData({ error: "开始时间需早于结束时间" });
      return;
    }
    const days = ALL_WEEKDAYS.filter((_, i) => this.data.weekdayEnabled[i]);
    if (!days.length) {
      this.setData({ error: "请至少选择一天" });
      return;
    }
    this.setData({ saving: true, error: "" });
    try {
      const ranges: WeeklyTimeRange[] = [
        {
          weekdays: days as Array<1 | 2 | 3 | 4 | 5 | 6 | 7>,
          startTime: this.data.startTime as `${number}:${number}`,
          endTime: this.data.endTime as `${number}:${number}`,
        },
      ];
      const input = {
        vehicleId: this.data.vehicleId,
        ranges,
        enabled: this.data.ruleEnabled,
        ownerShared: this.data.ownerShared,
      };
      if (isSharedMode()) await sharedFleet.saveAvailability(input.vehicleId, input);
      else ownerService.saveAvailability(input);
      wx.showToast({ title: "已保存", icon: "success" });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (e: any) {
      wx.showToast({ title: e.message || "保存失败", icon: "none" });
      this.setData({ saving: false });
    }
  },
}));
