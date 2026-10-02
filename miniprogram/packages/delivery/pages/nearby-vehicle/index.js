"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vehicle_products_1 = require("../../../../content/vehicle-products");
const vehicle_performance_1 = require("../../../../content/vehicle-performance");
const home_demo_fleet_1 = require("../../../../services/home-demo-fleet");
const remote_1 = require("../../../../services/remote");
const index_1 = require("../../../../repositories/index");
Page({
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
    async onLoad(options) {
        var _a;
        if ((0, remote_1.isSharedMode)())
            await remote_1.sharedPricing.syncModels().catch(() => undefined);
        const vehicle = home_demo_fleet_1.homeDemoFleet.getVehicle(decodeURIComponent(options.id || ""));
        const model = vehicle && vehicle_products_1.VEHICLE_CATALOG.find((item) => item.id === vehicle.modelId);
        if (!vehicle || !model)
            return;
        const performance = vehicle_performance_1.VEHICLE_PERFORMANCE[model.id];
        wx.setNavigationBarTitle({ title: model.name });
        this.setData({
            found: true,
            modelName: model.name,
            modelCode: model.code,
            modelImage: ((_a = index_1.repo.getVehicleModel(model.id)) === null || _a === void 0 ? void 0 : _a.imageUrl) || model.image,
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
            temperatureText: (performance === null || performance === void 0 ? void 0 : performance.temperatureRange) || "",
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
