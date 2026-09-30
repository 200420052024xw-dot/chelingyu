import { withPagePerformance } from "../../../../utils/page-performance";
import type { Vehicle, VehicleModel } from "../../../../contracts/types";
import { ownerService } from "../../../../services/owner";
import { repo } from "../../../../repositories/index";
import { formatDistance } from "../../../../adapters/geo";

interface PageData {
  vehicles: Array<Vehicle & { model: VehicleModel | undefined }>;
}

Page<PageData, any>(withPagePerformance<PageData, any>("packages/owner/pages/bind/index", {
  data: { vehicles: [] },

  onLoad() {
    const list = ownerService.listAvailableDemoVehicles().map((v) => ({
      ...v,
      model: repo.getVehicleModel(v.modelId),
    }));
    this.setData({ vehicles: list });
  },

  onBind(e: any) {
    const id = e.currentTarget.dataset.id;
    try {
      ownerService.bindDemoVehicle({ vehicleId: id });
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
