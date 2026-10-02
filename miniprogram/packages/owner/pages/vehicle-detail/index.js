"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_performance_1 = require("../../../../utils/page-performance");
const owner_1 = require("../../../../services/owner");
const local_database_1 = require("../../../../repositories/local-database");
const cargo_1 = require("../../../../view-models/cargo");
const index_1 = require("../../../../config/index");
const geo_1 = require("../../../../adapters/geo");
const remote_1 = require("../../../../services/remote");
const instance = {};
Page((0, page_performance_1.withPagePerformance)("packages/owner/pages/vehicle-detail/index", {
    data: {
        vehicleId: "",
        vehicle: null,
        model: null,
        rule: null,
        distanceText: "—",
        tasks: [],
    },
    onLoad(query) {
        const id = query === null || query === void 0 ? void 0 : query.id;
        this.setData({ vehicleId: id });
        this.refresh();
        if (!(0, remote_1.isSharedMode)())
            instance.unsubscribe = (0, local_database_1.subscribeDB)(() => this.refresh());
    },
    onShow() { if ((0, remote_1.isSharedMode)() && this.data.vehicleId)
        this.refresh(); },
    onUnload() {
        var _a;
        (_a = instance.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(instance);
    },
    async refresh() {
        var _a;
        try {
            const detail = (0, remote_1.isSharedMode)() ? await remote_1.sharedFleet.ownerVehicle(this.data.vehicleId) : owner_1.ownerService.vehicleDetail(this.data.vehicleId);
            const userLoc = index_1.APP_CONFIG.demoCenter;
            const dist = detail.vehicle.location ? (0, geo_1.haversineMeters)(detail.vehicle.location, userLoc) : 0;
            this.setData({
                vehicle: detail.vehicle,
                model: detail.model,
                rule: (_a = detail.rule) !== null && _a !== void 0 ? _a : null,
                distanceText: (0, geo_1.formatDistance)(dist),
                tasks: detail.tasks,
            });
        }
        catch (e) { }
    },
    onEditAvailability() {
        wx.navigateTo({ url: `/packages/owner/pages/availability/index?id=${this.data.vehicleId}` });
    },
    onOpenTasks() {
        wx.navigateTo({ url: `/packages/owner/pages/tasks/index?vehicleId=${this.data.vehicleId}` });
    },
    formatRule(r) {
        return (0, cargo_1.formatTimeRanges)(r === null || r === void 0 ? void 0 : r.ranges);
    },
}));
