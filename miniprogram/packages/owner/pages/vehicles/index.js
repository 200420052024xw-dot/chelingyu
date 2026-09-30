"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_performance_1 = require("../../../../utils/page-performance");
const owner_1 = require("../../../../services/owner");
const index_1 = require("../../../../repositories/index");
const local_database_1 = require("../../../../repositories/local-database");
const cargo_1 = require("../../../../view-models/cargo");
const geo_1 = require("../../../../adapters/geo");
const instance = {};
Page((0, page_performance_1.withPagePerformance)("packages/owner/pages/vehicles/index", {
    data: {
        vehicles: [],
    },
    onLoad() {
        this.refresh();
        instance.unsubscribe = (0, local_database_1.subscribeDB)(() => this.refresh());
    },
    onUnload() {
        var _a;
        (_a = instance.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(instance);
    },
    refresh() {
        const list = owner_1.ownerService.listVehicles().map((v) => (Object.assign(Object.assign({}, v), { model: index_1.repo.getVehicleModel(v.modelId), rule: index_1.repo.getAvailabilityRule(v.id) })));
        this.setData({ vehicles: list });
    },
    onOpenDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/packages/owner/pages/vehicle-detail/index?id=${id}` });
    },
    onBindNew() {
        wx.navigateTo({ url: "/packages/owner/pages/bind/index" });
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
