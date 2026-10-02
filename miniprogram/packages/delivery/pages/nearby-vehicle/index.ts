import { VEHICLE_CATALOG } from "../../../../content/vehicle-products";
import { VEHICLE_PERFORMANCE } from "../../../../content/vehicle-performance";
import { homeDemoFleet } from "../../../../services/home-demo-fleet";
import { isSharedMode, sharedPricing } from "../../../../services/remote";
import { repo } from "../../../../repositories/index";

interface PageData {
  found: boolean;
  modelName: string;
  modelCode: string;
  modelImage: string;
  description: string;
  status: string;
  locationText: string;
  batteryPercent: number;
  etaMinutes: number;
  loadText: string;
  volumeText: string;
  sizeText: string;
  rangeText: string;
  speedText: string;
  temperatureText: string;
  latitude: number;
  longitude: number;
  markers: Array<{ id: number; latitude: number; longitude: number; width: number; height: number; iconPath: string }>;
}

Page<PageData, any>({
  data: {
    found: false,
    modelName: "",
    modelCode: "",
    modelImage: "/assets/vehicles/delivery-pod.png",
    description: "",
    status: "",
    locationText: "",
    batteryPercent: 0,
    etaMinutes: 0,
    loadText: "",
    volumeText: "",
    sizeText: "",
    rangeText: "",
    speedText: "",
    temperatureText: "",
    latitude: 0,
    longitude: 0,
    markers: [],
  },

  async onLoad(options: { id?: string }) {
    if(isSharedMode()) await sharedPricing.syncModels().catch(()=>undefined);
    const vehicle = homeDemoFleet.getVehicle(decodeURIComponent(options.id || ""));
    const model = vehicle && VEHICLE_CATALOG.find((item) => item.id === vehicle.modelId);
    if (!vehicle || !model) return;
    const performance = VEHICLE_PERFORMANCE[model.id];
    wx.setNavigationBarTitle({ title: model.name });
    this.setData({
      found: true,
      modelName: model.name,
      modelCode: model.code,
      modelImage: repo.getVehicleModel(model.id)?.imageUrl || model.image,
      description: model.description,
      status: vehicle.status,
      locationText: vehicle.locationText,
      batteryPercent: vehicle.batteryPercent,
      etaMinutes: vehicle.etaMinutes,
      loadText: `${model.loadKg} kg`,
      volumeText: model.id === "z5-multi"
        ? "3.0 m³（6 格）"
        : `${(model.volumeLiters / 1000).toFixed(1)} m³`,
      sizeText: `${model.dimensions.length} × ${model.dimensions.width} × ${model.dimensions.height} mm`,
      rangeText: performance ? `${performance.rangeKm} km` : "以实际车型为准",
      speedText: performance ? `${performance.speedKmh} km/h` : "以实际车型为准",
      temperatureText: performance?.temperatureRange || "",
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
      markers: [{
        id: 1,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        width: 60,
        height: 60,
        iconPath: "/assets/vehicles/delivery-pod.png",
      }],
    });
  },

  onStartOrder() {
    wx.navigateTo({ url: "/pages/address-step/index" });
  },
});
