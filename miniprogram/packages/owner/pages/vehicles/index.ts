import { withPagePerformance } from "../../../../utils/page-performance";
import type { Vehicle, VehicleAvailabilityRule, VehicleModel } from "../../../../contracts/types";
import { ownerService } from "../../../../services/owner";
import { repo } from "../../../../repositories/index";
import { subscribeDB } from "../../../../repositories/local-database";
import { formatTimeRanges, formatVolume } from "../../../../view-models/cargo";
import { formatDistance } from "../../../../adapters/geo";

interface PageData {
  vehicles: Array<Vehicle & { model: VehicleModel | undefined; rule: VehicleAvailabilityRule | undefined }>;
}

interface PageInstance {
  unsubscribe?: () => void;
}

const instance: PageInstance = {};

Page<PageData, any>(withPagePerformance<PageData, any>("packages/owner/pages/vehicles/index", {
  data: {
    vehicles: [],
  },

  onLoad() {
    this.refresh();
    instance.unsubscribe = subscribeDB(() => this.refresh());
  },

  onUnload() {
    instance.unsubscribe?.();
  },

  refresh() {
    const list = ownerService.listVehicles().map((v) => ({
      ...v,
      model: repo.getVehicleModel(v.modelId),
      rule: repo.getAvailabilityRule(v.id),
    }));
    this.setData({ vehicles: list });
  },

  onOpenDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/packages/owner/pages/vehicle-detail/index?id=${id}` });
  },

  onBindNew() {
    wx.navigateTo({ url: "/packages/owner/pages/bind/index" });
  },

  formatTimeRanges(r?: VehicleAvailabilityRule) {
    return formatTimeRanges(r?.ranges);
  },

  formatVolume(v: number) {
    return formatVolume(v);
  },

  formatDistance(m?: number) {
    return m !== undefined ? formatDistance(m) : "—";
  },
}));
