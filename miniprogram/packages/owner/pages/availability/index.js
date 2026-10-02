"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_performance_1 = require("../../../../utils/page-performance");
const owner_1 = require("../../../../services/owner");
const remote_1 = require("../../../../services/remote");
const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
Page((0, page_performance_1.withPagePerformance)("packages/owner/pages/availability/index", {
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
        const id = query === null || query === void 0 ? void 0 : query.id;
        this.setData({ vehicleId: id });
        const detail = (0, remote_1.isSharedMode)() ? await remote_1.sharedFleet.ownerVehicle(id) : owner_1.ownerService.vehicleDetail(id);
        if (detail.rule) {
            const r = detail.rule.ranges[0] || { weekdays: ALL_WEEKDAYS, startTime: "08:00", endTime: "22:00" };
            this.setData({
                ruleEnabled: detail.rule.enabled,
                ownerShared: detail.vehicle.ownerShared,
                weekdayEnabled: ALL_WEEKDAYS.map((d) => r.weekdays.includes(d)),
                startTime: r.startTime,
                endTime: r.endTime,
            });
        }
        else {
            this.setData({ ownerShared: detail.vehicle.ownerShared });
        }
    },
    onToggleShare() {
        this.setData({ ownerShared: !this.data.ownerShared });
    },
    onToggleRule() {
        this.setData({ ruleEnabled: !this.data.ruleEnabled });
    },
    onToggleDay(e) {
        const idx = Number(e.currentTarget.dataset.idx);
        const next = [...this.data.weekdayEnabled];
        next[idx] = !next[idx];
        this.setData({ weekdayEnabled: next });
    },
    onPickStart(e) {
        this.setData({ startTime: e.detail.value });
    },
    onPickEnd(e) {
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
            const ranges = [
                {
                    weekdays: days,
                    startTime: this.data.startTime,
                    endTime: this.data.endTime,
                },
            ];
            const input = {
                vehicleId: this.data.vehicleId,
                ranges,
                enabled: this.data.ruleEnabled,
                ownerShared: this.data.ownerShared,
            };
            if ((0, remote_1.isSharedMode)())
                await remote_1.sharedFleet.saveAvailability(input.vehicleId, input);
            else
                owner_1.ownerService.saveAvailability(input);
            wx.showToast({ title: "已保存", icon: "success" });
            setTimeout(() => wx.navigateBack(), 600);
        }
        catch (e) {
            wx.showToast({ title: e.message || "保存失败", icon: "none" });
            this.setData({ saving: false });
        }
    },
}));
