"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_performance_1 = require("../../../../utils/page-performance");
const owner_1 = require("../../../../services/owner");
const index_1 = require("../../../../repositories/index");
const geo_1 = require("../../../../adapters/geo");
const remote_1 = require("../../../../services/remote");
Page((0, page_performance_1.withPagePerformance)("packages/owner/pages/bind/index", {
    data: { vehicles: [] },
    async onLoad() {
        if ((0, remote_1.isSharedMode)()) {
            try {
                this.setData({ vehicles: await remote_1.sharedFleet.availableDemoVehicles() });
            }
            catch (error) {
                wx.showToast({ title: (error === null || error === void 0 ? void 0 : error.message) || "加载失败", icon: "none" });
            }
            return;
        }
        const list = owner_1.ownerService.listAvailableDemoVehicles().map((v) => (Object.assign(Object.assign({}, v), { model: index_1.repo.getVehicleModel(v.modelId) })));
        this.setData({ vehicles: list });
    },
    async onBind(e) {
        const id = e.currentTarget.dataset.id;
        try {
            if ((0, remote_1.isSharedMode)())
                await remote_1.sharedFleet.bindDemoVehicle(id);
            else
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
