"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_performance_1 = require("../../../../utils/page-performance");
const owner_1 = require("../../../../services/owner");
const index_1 = require("../../../../repositories/index");
const geo_1 = require("../../../../adapters/geo");
Page((0, page_performance_1.withPagePerformance)("packages/owner/pages/bind/index", {
    data: { vehicles: [] },
    onLoad() {
        const list = owner_1.ownerService.listAvailableDemoVehicles().map((v) => (Object.assign(Object.assign({}, v), { model: index_1.repo.getVehicleModel(v.modelId) })));
        this.setData({ vehicles: list });
    },
    onBind(e) {
        const id = e.currentTarget.dataset.id;
        try {
            owner_1.ownerService.bindDemoVehicle({ vehicleId: id });
            wx.showToast({ title: "绑定成功", icon: "success" });
            setTimeout(() => wx.navigateBack(), 600);
        }
        catch (err) {
            wx.showToast({ title: err.message || "绑定失败", icon: "none" });
        }
    },
    formatDistance(m) {
        return m !== undefined ? (0, geo_1.formatDistance)(m) : "—";
    },
}));
