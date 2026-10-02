import { withPagePerformance } from "../../../../utils/page-performance";
import type { OrderStatus, OwnerTaskView } from "../../../../contracts/types";
import { ownerService } from "../../../../services/owner";
import { subscribeDB } from "../../../../repositories/local-database";
import { isSharedMode, sharedFleet } from "../../../../services/remote";
import { statusBadge } from "../../../../view-models/order";

type Range = "active" | "completed" | "all";

interface PageData {
  vehicleId: string;
  tasks: OwnerTaskView[];
  filteredTasks: OwnerTaskView[];
  range: Range;
  tabs: Array<{ key: Range; label: string }>;
  loading: boolean;
}

interface PageInstance {
  unsubscribe?: () => void;
}

const instance: PageInstance = {};

const ACTIVE_STATUSES: OrderStatus[] = [
  "paid",
  "scheduled",
  "matching",
  "dispatched",
  "vehicle_to_pickup",
  "awaiting_loading",
  "delivering",
  "arrived",
];

Page<PageData, any>(withPagePerformance<PageData, any>("packages/owner/pages/tasks/index", {
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
    const id = (query?.vehicleId as string) || "";
    this.setData({ vehicleId: id });
    this.refresh();
    if (!isSharedMode()) instance.unsubscribe = subscribeDB(() => this.refresh());
  },

  onShow() { if (isSharedMode()) this.refresh(); },

  onUnload() {
    instance.unsubscribe?.();
  },

  async refresh() {
    let list: OwnerTaskView[] = [];
    if (isSharedMode()) {
      try {
        const vehicleIds = this.data.vehicleId ? [this.data.vehicleId] : (await sharedFleet.ownerVehicles()).map(item => item.vehicle.id);
        const details = await Promise.all(vehicleIds.map(id => sharedFleet.ownerVehicle(id)));
        list = details.reduce<OwnerTaskView[]>((all, detail) => all.concat(detail.tasks.map(task => ({ ...task, statusBadge: statusBadge(task.status), pickup: task.pickup, dropoff: task.dropoff, scheduledAt: task.scheduledAt, estimatedPickupAt: task.estimatedPickupAt, estimatedDeliveryAt: task.estimatedDeliveryAt }))), []);
      } catch (error: any) { wx.showToast({ title: error?.message || "任务加载失败", icon: "none" }); }
    } else {
    if (!this.data.vehicleId) {
      for (const v of ownerService.listVehicles()) {
        list.push(...ownerService.tasksForVehicle(v.id).items);
      }
    } else {
      list = ownerService.tasksForVehicle(this.data.vehicleId).items;
    }
    }
    // 去重：按 orderId
    const byOrder = new Map<string, OwnerTaskView>();
    for (const t of list) byOrder.set(t.orderId, t);
    const unique = Array.from(byOrder.values());
    const filtered = this.applyFilter(unique, this.data.range);
    this.setData({ tasks: unique, filteredTasks: filtered, loading: false });
  },

  applyFilter(list: OwnerTaskView[], range: Range): OwnerTaskView[] {
    if (range === "all") return list;
    if (range === "completed") {
      return list.filter((t) => t.status === "completed" || t.status === "cancelled" || t.status === "failed");
    }
    return list.filter((t) => ACTIVE_STATUSES.includes(t.status));
  },

  onSwitchRange(e: any) {
    const key = e.currentTarget.dataset.key as Range;
    this.setData({ range: key });
    this.refresh();
  },

  onOpenDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    if (isSharedMode()) {
      const task = this.data.tasks.find(item => item.orderId === id);
      if (task) wx.showModal({ title: task.orderNo, content: `${task.pickup.name} → ${task.dropoff.name}\n${task.statusBadge.text}`, showCancel: false });
      return;
    }
    wx.navigateTo({ url: `/packages/delivery/pages/detail/index?id=${id}` });
  },
}));
