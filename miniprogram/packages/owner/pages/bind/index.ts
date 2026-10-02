import { withPagePerformance } from "../../../../utils/page-performance";
import type { Vehicle, VehicleModel } from "../../../../contracts/types";
import { ownerService } from "../../../../services/owner";
import { repo } from "../../../../repositories/index";
import { formatDistance } from "../../../../adapters/geo";
import { isSharedMode, sharedFleet } from "../../../../services/remote";

interface PageData {
  vehicles: Array<Vehicle & { model: VehicleModel | undefined }>;
}

Page<PageData, any>(withPagePerformance<PageData, any>("packages/owner/pages/bind/index", {
  data: { vehicles: [] },

  async onLoad() {
    if (isSharedMode()) {
      try { this.setData({ vehicles: await sharedFleet.availableDemoVehicles() }); }
      catch (error: any) { wx.showToast({ title: error?.message || "加载失败", icon: "none" }); }
      return;
    }
    const list = ownerService.listAvailableDemoVehicles().map((v) => ({
      ...v,
      model: repo.getVehicleModel(v.modelId),
    }));
    this.setData({ vehicles: list });
  },

  async onBind(e: any) {
    const id = e.currentTarget.dataset.id;
    try {
      if (isSharedMode()) await sharedFleet.bindDemoVehicle(id);
      else ownerService.bindDemoVehicle({ vehicleId: id });
      wx.showToast({ title: "绑定成功", icon: "success" });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (err: any) {
      wx.showToast({ title: err.message || "绑定失败", icon: "none" });
    }
  },

  formatDistance(m?: number) {
    return m !== undefined ? formatDistance(m) : "—";
  },
}));
