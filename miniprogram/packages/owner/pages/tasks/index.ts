import { withPagePerformance } from "../../../../utils/page-performance";
import type { OrderStatus, OwnerTaskView } from "../../../../contracts/types";
import { ownerService } from "../../../../services/owner";
import { subscribeDB } from "../../../../repositories/local-database";

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
    instance.unsubscribe = subscribeDB(() => this.refresh());
  },

  onUnload() {
    instance.unsubscribe?.();
  },

  refresh() {
    let list: OwnerTaskView[] = [];
    if (!this.data.vehicleId) {
      for (const v of ownerService.listVehicles()) {
        list.push(...ownerService.tasksForVehicle(v.id).items);
      }
    } else {
      list = ownerService.tasksForVehicle(this.data.vehicleId).items;
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
    wx.navigateTo({ url: `/packages/delivery/pages/detail/index?id=${id}` });
  },
}));