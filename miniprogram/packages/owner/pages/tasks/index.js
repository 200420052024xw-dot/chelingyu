"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_performance_1 = require("../../../../utils/page-performance");
const owner_1 = require("../../../../services/owner");
const local_database_1 = require("../../../../repositories/local-database");
const remote_1 = require("../../../../services/remote");
const order_1 = require("../../../../view-models/order");
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
        let list = [];
        if ((0, remote_1.isSharedMode)()) {
            try {
                const vehicleIds = this.data.vehicleId ? [this.data.vehicleId] : (await remote_1.sharedFleet.ownerVehicles()).map(item => item.vehicle.id);
                const details = await Promise.all(vehicleIds.map(id => remote_1.sharedFleet.ownerVehicle(id)));
                list = details.reduce((all, detail) => all.concat(detail.tasks.map(task => (Object.assign(Object.assign({}, task), { statusBadge: (0, order_1.statusBadge)(task.status), pickup: task.pickup, dropoff: task.dropoff, scheduledAt: task.scheduledAt, estimatedPickupAt: task.estimatedPickupAt, estimatedDeliveryAt: task.estimatedDeliveryAt })))), []);
            }
            catch (error) {
                wx.showToast({ title: (error === null || error === void 0 ? void 0 : error.message) || "任务加载失败", icon: "none" });
            }
        }
        else {
            if (!this.data.vehicleId) {
                for (const v of owner_1.ownerService.listVehicles()) {
                    list.push(...owner_1.ownerService.tasksForVehicle(v.id).items);
                }
            }
            else {
                list = owner_1.ownerService.tasksForVehicle(this.data.vehicleId).items;
            }
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
        if ((0, remote_1.isSharedMode)()) {
            const task = this.data.tasks.find(item => item.orderId === id);
            if (task)
                wx.showModal({ title: task.orderNo, content: `${task.pickup.name} → ${task.dropoff.name}\n${task.statusBadge.text}`, showCancel: false });
            return;
        }
        wx.navigateTo({ url: `/packages/delivery/pages/detail/index?id=${id}` });
    },
}));
