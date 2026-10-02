"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../../../config/index");
const home_demo_fleet_1 = require("../../../../services/home-demo-fleet");
const remote_1 = require("../../../../services/remote");
Page({
    data: {
        mode: "vehicles",
        title: "附近可用车辆",
        count: 0,
        rows: [],
    },
    async onLoad(options) {
        var _a, _b;
        const mode = options.mode === "status" ? "status" : "vehicles";
        let snapshot;
        try {
            snapshot = (0, remote_1.isSharedMode)()
                ? home_demo_fleet_1.homeDemoFleet.useShared(((_a = home_demo_fleet_1.homeDemoFleet.getSnapshot()) === null || _a === void 0 ? void 0 : _a.anchor) || index_1.APP_CONFIG.demoCenter, "当前区域", await remote_1.sharedFleet.list())
                : (_b = home_demo_fleet_1.homeDemoFleet.getSnapshot()) !== null && _b !== void 0 ? _b : home_demo_fleet_1.homeDemoFleet.regenerate(index_1.APP_CONFIG.demoCenter, "演示区域");
        }
        catch (error) {
            wx.showToast({ title: (error === null || error === void 0 ? void 0 : error.message) || "车辆加载失败", icon: "none" });
            return;
        }
        const title = mode === "status" ? "服务状态" : "附近可用车辆";
        wx.setNavigationBarTitle({ title });
        this.setData({
            mode,
            title,
            count: snapshot.vehicles.length,
            rows: snapshot.vehicles.map((vehicle) => (Object.assign(Object.assign({}, vehicle), { coordinateText: `${vehicle.latitude.toFixed(5)}, ${vehicle.longitude.toFixed(5)}` }))),
        });
    },
    onOpenVehicle(e) {
        const id = String(e.currentTarget.dataset.id || "");
        if (!home_demo_fleet_1.homeDemoFleet.getVehicle(id))
            return;
        wx.navigateTo({ url: `/packages/delivery/pages/nearby-vehicle/index?id=${encodeURIComponent(id)}` });
    },
});
