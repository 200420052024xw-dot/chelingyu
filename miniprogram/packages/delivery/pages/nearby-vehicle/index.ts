import { VEHICLE_CATALOG } from "../../../../content/vehicle-products";
import { homeDemoFleet } from "../../../../services/home-demo-fleet";

interface PageData {
  found: boolean;
  modelName: string;
  modelCode: string;
  description: string;
  status: string;
  locationText: string;
  coordinateText: string;
  etaMinutes: number;
  loadText: string;
  volumeText: string;
  sizeText: string;
  coldText: string;
  latitude: number;
  longitude: number;
  markers: Array<{ id: number; latitude: number; longitude: number; width: number; height: number; iconPath: string }>;
}

Page<PageData, any>({
  data: {
    found: false,
    modelName: "",
    modelCode: "",
    description: "",
    status: "",
    locationText: "",
    coordinateText: "",
    etaMinutes: 0,
    loadText: "",
    volumeText: "",
    sizeText: "",
    coldText: "",
    latitude: 0,
    longitude: 0,
    markers: [],
  },

  onLoad(options: { id?: string }) {
    const vehicle = homeDemoFleet.getVehicle(decodeURIComponent(options.id || ""));
    const model = vehicle && VEHICLE_CATALOG.find((item) => item.id === vehicle.modelId);
    if (!vehicle || !model) return;
    wx.setNavigationBarTitle({ title: model.name });
    this.setData({
      found: true,
      modelName: model.name,
      modelCode: model.code,
      description: model.description,
      status: vehicle.status,
      locationText: vehicle.locationText,
      coordinateText: `${vehicle.latitude.toFixed(5)}, ${vehicle.longitude.toFixed(5)}`,
      etaMinutes: vehicle.etaMinutes,
      loadText: `${model.loadKg} kg`,
      volumeText: `${model.volumeLiters} L`,
      sizeText: `${model.dimensions.length} × ${model.dimensions.width} × ${model.dimensions.height} mm`,
      coldText: model.cold ? "支持冷链" : "常温配送",
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
