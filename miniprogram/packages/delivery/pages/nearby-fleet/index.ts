import { APP_CONFIG } from "../../../../config/index";
import { homeDemoFleet, HomeDemoVehicle } from "../../../../services/home-demo-fleet";
import { isSharedMode, sharedFleet } from "../../../../services/remote";

interface VehicleRow extends HomeDemoVehicle { coordinateText: string }
interface PageData {
  mode: "vehicles" | "status";
  title: string;
  count: number;
  rows: VehicleRow[];
}

Page<PageData, any>({
  data: {
    mode: "vehicles",
    title: "附近可用车辆",
    count: 0,
    rows: [],
  },

  async onLoad(options: { mode?: string }) {
    const mode = options.mode === "status" ? "status" : "vehicles";
    let snapshot;
    try {
      snapshot = isSharedMode()
        ? homeDemoFleet.useShared(homeDemoFleet.getSnapshot()?.anchor || APP_CONFIG.demoCenter, "当前区域", await sharedFleet.list())
        : homeDemoFleet.getSnapshot() ?? homeDemoFleet.regenerate(APP_CONFIG.demoCenter, "演示区域");
    } catch (error: any) {
      wx.showToast({ title: error?.message || "车辆加载失败", icon: "none" });
      return;
    }
    const title = mode === "status" ? "服务状态" : "附近可用车辆";
    wx.setNavigationBarTitle({ title });
    this.setData({
      mode,
      title,
      count: snapshot.vehicles.length,
      rows: snapshot.vehicles.map((vehicle) => ({
        ...vehicle,
        coordinateText: `${vehicle.latitude.toFixed(5)}, ${vehicle.longitude.toFixed(5)}`,
      })),
    });
  },

  onOpenVehicle(e: any) {
    const id = String(e.currentTarget.dataset.id || "");
    if (!homeDemoFleet.getVehicle(id)) return;
    wx.navigateTo({ url: `/packages/delivery/pages/nearby-vehicle/index?id=${encodeURIComponent(id)}` });
  },
});
