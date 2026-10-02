import { repo } from "../../../../repositories/index";
import { VEHICLE_PERFORMANCE } from "../../../../content/vehicle-performance";
import { isSharedMode, sharedPricing } from "../../../../services/remote";

Page({
  data: {
    found: false,
    image: "",
    name: "",
    code: "",
    description: "",
    load: "",
    volume: "",
    dimensions: "",
    range: "",
    speed: "",
    temperature: "",
  },
  async onLoad(query: { modelId?: string }) {
    if(isSharedMode()) await sharedPricing.syncModels().catch(()=>undefined);
    const model = repo.getVehicleModel(decodeURIComponent(query.modelId || ""));
    if (!model) return;
    const performance = VEHICLE_PERFORMANCE[model.id];
    const box = model.cargoBoxDimensionsMm;
    wx.setNavigationBarTitle({ title: model.name });
    this.setData({
      found: true,
      image: model.imageUrl,
      name: model.name,
      code: model.code,
      description: model.description || "",
      load: `${model.maxLoadGrams / 1000} kg`,
      volume: `${model.cargoVolumeLiters / 1000} m³`,
      dimensions: box && box.length > 0 && box.width > 0 && box.height > 0
        ? `${box.length / 1000} × ${box.width / 1000} × ${box.height / 1000} 米`
        : "暂无尺寸",
      range: performance ? `${performance.rangeKm} km` : "以实际车辆为准",
      speed: performance ? `${performance.speedKmh} km/h` : "以实际车辆为准",
      temperature: performance?.temperatureRange || "",
    });
  },
});
