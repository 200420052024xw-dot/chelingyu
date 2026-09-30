import { withPagePerformance } from "../../../../utils/page-performance";
import type { Vehicle, VehicleAvailabilityRule, VehicleModel } from "../../../../contracts/types";
import { ownerService } from "../../../../services/owner";
import { subscribeDB } from "../../../../repositories/local-database";
import { formatTimeRanges } from "../../../../view-models/cargo";
import { APP_CONFIG } from "../../../../config/index";
import { haversineMeters, formatDistance } from "../../../../adapters/geo";

interface PageData {
  vehicleId: string;
  vehicle: Vehicle | null;
  model: VehicleModel | null;
  rule: VehicleAvailabilityRule | null;
  distanceText: string;
  tasks: ReturnType<typeof ownerService.tasksForVehicle>["items"];
}

interface PageInstance {
  unsubscribe?: () => void;
}

const instance: PageInstance = {};

Page<PageData, any>(withPagePerformance<PageData, any>("packages/owner/pages/vehicle-detail/index", {
  data: {
    vehicleId: "",
    vehicle: null,
    model: null,
    rule: null,
    distanceText: "—",
    tasks: [],
  },

  onLoad(query) {
    const id = query?.id as string;
    this.setData({ vehicleId: id });
    this.refresh();
    instance.unsubscribe = subscribeDB(() => this.refresh());
  },

  onUnload() {
    instance.unsubscribe?.();
  },

  refresh() {
    try {
      const detail = ownerService.vehicleDetail(this.data.vehicleId);
      const userLoc = APP_CONFIG.demoCenter;
      const dist = detail.vehicle.location ? haversineMeters(detail.vehicle.location, userLoc) : 0;
      this.setData({
        vehicle: detail.vehicle,
        model: detail.model,
        rule: detail.rule ?? null,
        distanceText: formatDistance(dist),
        tasks: detail.tasks,
      });
    } catch (e) {}
  },

  onEditAvailability() {
    wx.navigateTo({ url: `/packages/owner/pages/availability/index?id=${this.data.vehicleId}` });
  },

  onOpenTasks() {
    wx.navigateTo({ url: `/packages/owner/pages/tasks/index?vehicleId=${this.data.vehicleId}` });
  },

  formatRule(r?: VehicleAvailabilityRule | null) {
    return formatTimeRanges(r?.ranges);
  },
}));
