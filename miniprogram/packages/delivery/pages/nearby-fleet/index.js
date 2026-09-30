"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../../../config/index");
const home_demo_fleet_1 = require("../../../../services/home-demo-fleet");
Page({
    data: {
        mode: "vehicles",
        title: "附近可用车辆",
        anchorLabel: "演示区域",
        count: 0,
        rows: [],
    },
    onLoad(options) {
        var _a;
        const mode = options.mode === "status" ? "status" : "vehicles";
        const snapshot = (_a = home_demo_fleet_1.homeDemoFleet.getSnapshot()) !== null && _a !== void 0 ? _a : home_demo_fleet_1.homeDemoFleet.regenerate(index_1.APP_CONFIG.demoCenter, "演示区域");
        const title = mode === "status" ? "服务状态" : "附近可用车辆";
        wx.setNavigationBarTitle({ title });
        this.setData({
            mode,
            title,
            anchorLabel: snapshot.anchorLabel,
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
