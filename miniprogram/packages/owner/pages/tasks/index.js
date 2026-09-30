"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_performance_1 = require("../../../../utils/page-performance");
const owner_1 = require("../../../../services/owner");
const local_database_1 = require("../../../../repositories/local-database");
const instance = {};
const ACTIVE_STATUSES = [
    "paid",
    "scheduled",
    "matching",
    "dispatched",
    "vehicle_to_pickup",
    "awaiting_loading",
    "delivering",
    "arrived",
];
Page((0, page_performance_1.withPagePerformance)("packages/owner/pages/tasks/index", {
    data: {
        vehicleId: "",
        tasks: [],
        filteredTasks: [],
        range: "active",
        tabs: [
            { key: "active", label: "进行中" },
            { key: "completed", label: "已完成" },
            { key: "all", label: "全部" },
        ],
        loading: true,
    },
    onLoad(query) {
        const id = (query === null || query === void 0 ? void 0 : query.vehicleId) || "";
        this.setData({ vehicleId: id });
        this.refresh();
        instance.unsubscribe = (0, local_database_1.subscribeDB)(() => this.refresh());
    },
    onUnload() {
        var _a;
        (_a = instance.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(instance);
    },
    refresh() {
        let list = [];
        if (!this.data.vehicleId) {
            for (const v of owner_1.ownerService.listVehicles()) {
                list.push(...owner_1.ownerService.tasksForVehicle(v.id).items);
            }
        }
        else {
            list = owner_1.ownerService.tasksForVehicle(this.data.vehicleId).items;
        }
        // 去重：按 orderId
        const byOrder = new Map();
        for (const t of list)
            byOrder.set(t.orderId, t);
        const unique = Array.from(byOrder.values());
        const filtered = this.applyFilter(unique, this.data.range);
        this.setData({ tasks: unique, filteredTasks: filtered, loading: false });
    },
    applyFilter(list, range) {
        if (range === "all")
            return list;
        if (range === "completed") {
            return list.filter((t) => t.status === "completed" || t.status === "cancelled" || t.status === "failed");
        }
        return list.filter((t) => ACTIVE_STATUSES.includes(t.status));
    },
    onSwitchRange(e) {
        const key = e.currentTarget.dataset.key;
        this.setData({ range: key });
        this.refresh();
    },
    onOpenDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/packages/delivery/pages/detail/index?id=${id}` });
    },
}));
