"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../config/index");
const notification_1 = require("../../services/notification");
const vehicle_products_1 = require("../../content/vehicle-products");
const location_1 = require("../../adapters/location");
const fleet_1 = require("../../services/fleet");
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
        selectedMarkerId: null,
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
        product: vehicle_products_1.VEHICLE_PRODUCTS.truck,
    },
    onLoad() {
        const dimensions = layout();
        this.setData(Object.assign(Object.assign({}, dimensions), { floatActionsOffset: dimensions.bottomCardHeight + 12 }));
        const selected = location_1.locationAdapter.getHomeSelectedPlace();
        if (selected)
            this.applyLocation(selected.point, selected.label, "selected", selected.detail);
        else
            this.refreshLocation();
    },
    onShow() {
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
    syncFloatingActions() {
        if (typeof wx.createSelectorQuery !== "function")
            return;
        wx.nextTick(() => {
            const selector = this.data.selectedMarkerId === null ? ".bottom-card" : ".vehicle-drawer.open";
            wx.createSelectorQuery().in(this).select(selector).boundingClientRect((rect) => {
                if (rect === null || rect === void 0 ? void 0 : rect.height)
                    this.setData({ floatActionsOffset: Math.ceil(rect.height) + 12 });
            }).exec();
        });
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
                this.setData({ hasRealLocation: false, locationLoading: false, regionSub: "定位失败，点击重试", markers: [] });
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
            selectedMarkerId: null,
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
    applyLocation(point, label, mode, detail = "") {
        const nearby = fleet_1.fleetService.nearby({ userLocation: point })
            .filter((v) => v.distanceToUserMeters <= 5000 && v.recommended);
        const markers = nearby.map((vehicle, index) => ({
            id: index + 1,
            latitude: vehicle.location.latitude,
            longitude: vehicle.location.longitude,
            width: 52,
            height: 52,
            iconPath: "/assets/vehicles/delivery-pod.png",
        }));
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
        var _a;
        const id = Number((_a = e === null || e === void 0 ? void 0 : e.detail) === null || _a === void 0 ? void 0 : _a.markerId);
        if (!Number.isInteger(id) || id < 1 || id > this.data.markers.length)
            return;
        this.setData({ selectedMarkerId: id }, () => this.syncFloatingActions());
    },
    onMapTap() {
        if (this.data.selectedMarkerId !== null)
            this.setData({ selectedMarkerId: null }, () => this.syncFloatingActions());
    },
    onCloseDrawer() {
        this.setData({ selectedMarkerId: null }, () => this.syncFloatingActions());
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
    onViewProduct() {
        const product = vehicle_products_1.VEHICLE_PRODUCTS.truck;
        wx.showModal({
            title: product.name,
            content: `${product.description}\n自动驾驶 ${product.level}\n最大载重 ${product.maxLoad}\n续航里程 ${product.range}\n最高时速 ${product.topSpeed}`,
            showCancel: false,
        });
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
