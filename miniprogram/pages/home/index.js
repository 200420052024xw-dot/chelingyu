"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../config/index");
const notification_1 = require("../../services/notification");
const location_1 = require("../../adapters/location");
const home_demo_fleet_1 = require("../../services/home-demo-fleet");
const tencent_maps_1 = require("../../adapters/tencent-maps");
const page_performance_1 = require("../../utils/page-performance");
let openingOrder = false;
let locationRequestVersion = 0;
function layout() {
    try {
        const windowInfo = wx.getWindowInfo();
        const menu = wx.getMenuButtonBoundingClientRect();
        return {
            topBarOffset: menu.top,
            topBarRight: Number.isFinite(menu.left) ? Math.max(16, windowInfo.windowWidth - menu.left + 8) : 112,
            bottomCardHeight: Math.min(290, Math.max(230, Math.round(windowInfo.windowHeight * 0.33))),
        };
    }
    catch (_) {
        return { topBarOffset: 28, topBarRight: 112, bottomCardHeight: 240 };
    }
}
Page((0, page_performance_1.withPagePerformance)("home", {
    data: {
        regionLabel: "正在定位",
        regionSub: "获取附近地点",
        mapLat: index_1.APP_CONFIG.demoCenter.latitude,
        mapLng: index_1.APP_CONFIG.demoCenter.longitude,
        mapScale: index_1.MAP_DEFAULTS.scale,
        mapReady: false,
        hasRealLocation: false,
        markers: [],
        unreadCount: 0,
        arrivalMinutes: 0,
        locationMode: "none",
        locationLoading: false,
        openingOrder: false,
        topBarOffset: 28,
        topBarRight: 112,
        floatActionsOffset: 260,
        bottomCardHeight: 240,
        supportContactOpen: false,
    },
    onLoad() {
        this.hasShownHome = false;
        const dimensions = layout();
        this.setData(Object.assign(Object.assign({}, dimensions), { floatActionsOffset: dimensions.bottomCardHeight + 12 }));
        const selected = location_1.locationAdapter.getHomeSelectedPlace();
        if (selected)
            this.applyLocation(selected.point, selected.label, "selected", selected.detail, true);
        else {
            this.refreshDemoFleet(index_1.APP_CONFIG.demoCenter, "演示区域");
            this.refreshLocation();
        }
    },
    onShow() {
        if (this.hasShownHome) {
            this.refreshDemoFleet({ latitude: this.data.mapLat, longitude: this.data.mapLng }, this.data.locationMode === "none" ? "演示区域" : this.data.regionLabel);
        }
        this.hasShownHome = true;
        this.setData({ unreadCount: notification_1.notificationService.unreadCount() });
        openingOrder = false;
        this.setData({ openingOrder: false });
    },
    onResize() {
        const dimensions = layout();
        this.setData(Object.assign(Object.assign({}, dimensions), { floatActionsOffset: dimensions.bottomCardHeight + 12 }));
    },
    onMapUpdated() {
        if (!this.data.mapReady)
            this.setData({ mapReady: true });
    },
    onMapError(e) {
        var _a;
        console.error("[home] map unavailable", (_a = e === null || e === void 0 ? void 0 : e.detail) !== null && _a !== void 0 ? _a : e);
        this.setData({ mapReady: false });
    },
    async refreshLocation(recenterMap = false) {
        var _a;
        const requestVersion = ++locationRequestVersion;
        this.setData(this.data.locationMode === "none"
            ? { regionLabel: "正在定位", regionSub: "获取附近地点", locationLoading: true }
            : { locationLoading: true });
        try {
            const point = await location_1.locationAdapter.requestLocation();
            if (requestVersion !== locationRequestVersion)
                return;
            location_1.locationAdapter.setUserLocation(point);
            location_1.locationAdapter.clearHomeSelectedPlace();
            this.applyLocation(point, "正在解析地点", "gps", "请稍候");
            if (recenterMap)
                this.restoreMapView(point);
            (0, tencent_maps_1.reverseGeocodeByWebService)(point).then((place) => {
                if (requestVersion !== locationRequestVersion
                    || this.data.locationMode !== "gps"
                    || this.data.mapLat !== point.latitude
                    || this.data.mapLng !== point.longitude)
                    return;
                home_demo_fleet_1.homeDemoFleet.setAnchorLabel(place.name);
                this.setData({ regionLabel: place.name, regionSub: place.address === place.name ? "点击选择地点" : place.address });
            }).catch((error) => {
                if (requestVersion !== locationRequestVersion)
                    return;
                console.warn("[home] reverse geocoding failed", {
                    code: error === null || error === void 0 ? void 0 : error.code,
                    status: error === null || error === void 0 ? void 0 : error.status,
                    message: error === null || error === void 0 ? void 0 : error.message,
                });
                if (this.data.locationMode === "gps" && this.data.mapLat === point.latitude && this.data.mapLng === point.longitude) {
                    this.setData({ regionLabel: "点击选择地点", regionSub: "地图已定位，点此选择地点名称" });
                }
            });
        }
        catch (error) {
            if (requestVersion !== locationRequestVersion)
                return;
            console.warn("[home] wx.getLocation failed", error);
            if (this.data.locationMode === "none") {
                this.setData({ hasRealLocation: false, locationLoading: false, regionSub: "定位失败，点击重试" });
            }
            else {
                this.setData({ locationLoading: false });
            }
            const message = String((_a = error === null || error === void 0 ? void 0 : error.errMsg) !== null && _a !== void 0 ? _a : "");
            if (message.includes("auth deny") || message.includes("authorize")) {
                wx.showModal({
                    title: "需要定位权限",
                    content: "允许微信访问位置信息后，才能显示您附近的运力。",
                    success: (result) => { if (result.confirm)
                        wx.openSetting({ success: () => this.refreshLocation() }); },
                });
            }
        }
    },
    restoreMapView(point) {
        this.setData({
            mapScale: index_1.MAP_DEFAULTS.scale,
            floatActionsOffset: this.data.bottomCardHeight + 12,
        }, () => {
            const move = () => {
                if (typeof wx.createMapContext !== "function")
                    return;
                wx.createMapContext("map", this).moveToLocation({
                    latitude: point.latitude,
                    longitude: point.longitude,
                });
            };
            if (typeof wx.nextTick === "function")
                wx.nextTick(move);
            else
                move();
        });
    },
    refreshDemoFleet(point, label, randomize = true) {
        const snapshot = randomize
            ? home_demo_fleet_1.homeDemoFleet.regenerate(point, label)
            : home_demo_fleet_1.homeDemoFleet.relocate(point, label);
        const markers = snapshot.vehicles.map((vehicle) => ({
            id: vehicle.markerId,
            latitude: vehicle.latitude,
            longitude: vehicle.longitude,
            width: 52,
            height: 52,
            iconPath: "/assets/vehicles/delivery-pod.png",
        }));
        this.setData({ markers });
        return markers;
    },
    applyLocation(point, label, mode, detail = "", randomize = false) {
        const markers = this.refreshDemoFleet(point, mode === "gps" ? "当前定位点" : label, randomize);
        this.setData({
            mapLat: point.latitude,
            mapLng: point.longitude,
            regionLabel: label || "已选位置",
            regionSub: detail || "点击选择地点",
            hasRealLocation: mode === "gps",
            locationMode: mode,
            locationLoading: false,
            arrivalMinutes: 0,
            markers,
        });
    },
    onMarkerTap(e) {
        var _a, _b;
        const id = Number((_a = e === null || e === void 0 ? void 0 : e.detail) === null || _a === void 0 ? void 0 : _a.markerId);
        const vehicle = (_b = home_demo_fleet_1.homeDemoFleet.getSnapshot()) === null || _b === void 0 ? void 0 : _b.vehicles.find((item) => item.markerId === id);
        if (vehicle)
            this.openDemoVehicle(vehicle.id);
    },
    openDemoVehicle(id) {
        wx.navigateTo({ url: `/packages/delivery/pages/nearby-vehicle/index?id=${encodeURIComponent(id)}` });
    },
    onOpenNearbyVehicles() {
        wx.navigateTo({ url: "/packages/delivery/pages/nearby-fleet/index?mode=vehicles" });
    },
    onOpenServiceStatus() {
        wx.navigateTo({ url: "/packages/delivery/pages/nearby-fleet/index?mode=status" });
    },
    onPickRegion() {
        wx.chooseLocation({
            latitude: this.data.mapLat,
            longitude: this.data.mapLng,
            success: (place) => {
                locationRequestVersion += 1;
                const point = { latitude: place.latitude, longitude: place.longitude };
                const label = place.name || place.address || "已选位置";
                location_1.locationAdapter.setHomeSelectedPlace(point, label, place.address || "");
                this.applyLocation(point, label, "selected", place.address || "");
            },
            fail: (error) => {
                var _a;
                if (!String((_a = error === null || error === void 0 ? void 0 : error.errMsg) !== null && _a !== void 0 ? _a : "").includes("cancel")) {
                    wx.showToast({ title: "选点失败，请重试", icon: "none" });
                }
            },
        });
    },
    onLocateMe() { return this.refreshLocation(true); },
    onOpenMessages() {
        wx.navigateTo({ url: "/packages/account/pages/messages/index" });
    },
    onCallSupport() {
        this.setData({ supportContactOpen: true });
    },
    onCloseSupportContact() {
        this.setData({ supportContactOpen: false });
    },
    onOpenSupportTickets() {
        this.setData({ supportContactOpen: false });
        wx.navigateTo({ url: "/packages/account/pages/support/index" });
    },
    onStartOrder() {
        if (openingOrder)
            return;
        openingOrder = true;
        this.setData({ openingOrder: true });
        wx.navigateTo({
            url: "/pages/address-step/index",
            fail: () => { openingOrder = false; this.setData({ openingOrder: false }); },
        });
    },
}));
