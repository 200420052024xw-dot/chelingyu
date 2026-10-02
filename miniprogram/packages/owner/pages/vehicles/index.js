"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_performance_1 = require("../../../../utils/page-performance");
const owner_1 = require("../../../../services/owner");
const index_1 = require("../../../../repositories/index");
const local_database_1 = require("../../../../repositories/local-database");
const cargo_1 = require("../../../../view-models/cargo");
const geo_1 = require("../../../../adapters/geo");
const remote_1 = require("../../../../services/remote");
const instance = {};
Page((0, page_performance_1.withPagePerformance)("packages/owner/pages/vehicles/index", {
    data: {
        vehicles: [], applications: [], formOpen: false, modelOptions: [], areaOptions: [], vehicleNo: "", modelId: "", areaId: "", modelName: "", areaName: "", imagePath: "", submitting: false,
    },
    onLoad() {
        this.refresh();
        if (!(0, remote_1.isSharedMode)())
            instance.unsubscribe = (0, local_database_1.subscribeDB)(() => this.refresh());
    },
    onShow() { if ((0, remote_1.isSharedMode)())
        this.refresh(); },
    onUnload() {
        var _a;
        (_a = instance.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(instance);
    },
    async refresh() {
        if ((0, remote_1.isSharedMode)()) {
            try {
                const [items, applications] = await Promise.all([remote_1.sharedFleet.ownerVehicles(), remote_1.sharedVehicleApplications.list()]);
                this.setData({ vehicles: items.map(item => (Object.assign(Object.assign({}, item.vehicle), { model: item.model, rule: item.rule }))), applications });
            }
            catch (error) {
                wx.showToast({ title: (error === null || error === void 0 ? void 0 : error.message) || "车辆加载失败", icon: "none" });
            }
            return;
        }
        const list = owner_1.ownerService.listVehicles().map((v) => (Object.assign(Object.assign({}, v), { model: index_1.repo.getVehicleModel(v.modelId), rule: index_1.repo.getAvailabilityRule(v.id) })));
        this.setData({ vehicles: list });
    },
    onOpenDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/packages/owner/pages/vehicle-detail/index?id=${id}` });
    },
    onBindNew() {
        if ((0, remote_1.isSharedMode)()) {
            this.setData({ formOpen: true });
            void this.loadFormOptions();
            return;
        }
        wx.navigateTo({ url: "/packages/owner/pages/bind/index" });
    },
    async loadFormOptions() {
        var _a, _b, _c, _d, _e, _f;
        try {
            const [models, regions] = await Promise.all([remote_1.sharedPricing.syncModels(), remote_1.sharedFleet.regions()]);
            this.setData({ modelOptions: models, areaOptions: regions.areas, modelId: this.data.modelId || ((_a = models[0]) === null || _a === void 0 ? void 0 : _a.id) || "", areaId: this.data.areaId || ((_b = regions.areas[0]) === null || _b === void 0 ? void 0 : _b.id) || "", modelName: ((_c = models.find(m => m.id === this.data.modelId)) === null || _c === void 0 ? void 0 : _c.name) || ((_d = models[0]) === null || _d === void 0 ? void 0 : _d.name) || "", areaName: ((_e = regions.areas.find(a => a.id === this.data.areaId)) === null || _e === void 0 ? void 0 : _e.name) || ((_f = regions.areas[0]) === null || _f === void 0 ? void 0 : _f.name) || "" });
        }
        catch (error) {
            wx.showToast({ title: (error === null || error === void 0 ? void 0 : error.message) || "资料加载失败", icon: "none" });
        }
    },
    onCloseForm() { this.setData({ formOpen: false }); },
    onVehicleNo(e) { this.setData({ vehicleNo: e.detail.value }); },
    onModelPick(e) { const model = this.data.modelOptions[Number(e.detail.value)]; this.setData({ modelId: (model === null || model === void 0 ? void 0 : model.id) || "", modelName: (model === null || model === void 0 ? void 0 : model.name) || "" }); },
    onAreaPick(e) { const area = this.data.areaOptions[Number(e.detail.value)]; this.setData({ areaId: (area === null || area === void 0 ? void 0 : area.id) || "", areaName: (area === null || area === void 0 ? void 0 : area.name) || "" }); },
    onChoosePhoto() { wx.chooseImage({ count: 1, sizeType: ["compressed"], success: r => this.setData({ imagePath: r.tempFilePaths[0] }) }); },
    async onSubmitApplication() {
        if (this.data.submitting)
            return;
        if (!this.data.vehicleNo.trim() || !this.data.modelId || !this.data.areaId || !this.data.imagePath) {
            wx.showToast({ title: "请填写资料并上传车辆照片", icon: "none" });
            return;
        }
        this.setData({ submitting: true });
        try {
            const imageBase64 = await new Promise((resolve, reject) => wx.getFileSystemManager().readFile({ filePath: this.data.imagePath, encoding: "base64", success: r => resolve(String(r.data)), fail: reject }));
            await remote_1.sharedVehicleApplications.submit({ vehicleNo: this.data.vehicleNo, modelId: this.data.modelId, areaId: this.data.areaId, imageBase64 });
            this.setData({ formOpen: false, vehicleNo: "", imagePath: "" });
            await this.refresh();
            wx.showToast({ title: "已提交区级审核", icon: "success" });
        }
        catch (error) {
            wx.showToast({ title: (error === null || error === void 0 ? void 0 : error.message) || "提交失败", icon: "none" });
        }
        finally {
            this.setData({ submitting: false });
        }
    },
    formatTimeRanges(r) {
        return (0, cargo_1.formatTimeRanges)(r === null || r === void 0 ? void 0 : r.ranges);
    },
    formatVolume(v) {
        return (0, cargo_1.formatVolume)(v);
    },
    formatDistance(m) {
        return m !== undefined ? (0, geo_1.formatDistance)(m) : "—";
    },
}));
