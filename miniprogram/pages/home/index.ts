import { APP_CONFIG, MAP_DEFAULTS } from "../../config/index";
import { notificationService } from "../../services/notification";
import { locationAdapter } from "../../adapters/location";
import { homeDemoFleet } from "../../services/home-demo-fleet";
import { reverseGeocodeByWebService } from "../../adapters/tencent-maps";
import { withPagePerformance } from "../../utils/page-performance";

interface PageData {
  regionLabel: string;
  regionSub: string;
  mapLat: number;
  mapLng: number;
  mapScale: number;
  mapReady: boolean;
  hasRealLocation: boolean;
  markers: Array<{
    id: number;
    latitude: number;
    longitude: number;
    width: number;
    height: number;
    iconPath: string;
  }>;
  unreadCount: number;
  arrivalMinutes: number;
  locationMode: "gps" | "selected" | "none";
  locationLoading: boolean;
  openingOrder: boolean;
  topBarOffset: number;
  topBarRight: number;
  floatActionsOffset: number;
  bottomCardHeight: number;
  supportContactOpen: boolean;
}

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
  } catch (_) {
    return { topBarOffset: 28, topBarRight: 112, bottomCardHeight: 240 };
  }
}

Page<PageData, any>(withPagePerformance<PageData, any>("home", {
  data: {
    regionLabel: "正在定位",
    regionSub: "获取附近地点",
    mapLat: APP_CONFIG.demoCenter.latitude,
    mapLng: APP_CONFIG.demoCenter.longitude,
    mapScale: MAP_DEFAULTS.scale,
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
    this.setData({ ...dimensions, floatActionsOffset: dimensions.bottomCardHeight + 12 });
    const selected = locationAdapter.getHomeSelectedPlace();
    if (selected) this.applyLocation(selected.point, selected.label, "selected", selected.detail, true);
    else {
      this.refreshDemoFleet(APP_CONFIG.demoCenter, "演示区域");
      this.refreshLocation();
    }
  },

  onShow() {
    if (this.hasShownHome) {
      this.refreshDemoFleet(
        { latitude: this.data.mapLat, longitude: this.data.mapLng },
        this.data.locationMode === "none" ? "演示区域" : this.data.regionLabel,
      );
    }
    this.hasShownHome = true;
    this.setData({ unreadCount: notificationService.unreadCount() });
    openingOrder = false;
    this.setData({ openingOrder: false });
  },

  onResize() {
    const dimensions = layout();
    this.setData({ ...dimensions, floatActionsOffset: dimensions.bottomCardHeight + 12 });
  },

  onMapUpdated() {
    if (!this.data.mapReady) this.setData({ mapReady: true });
  },

  onMapError(e: any) {
    console.error("[home] map unavailable", e?.detail ?? e);
    this.setData({ mapReady: false });
  },

  async refreshLocation(recenterMap = false) {
    const requestVersion = ++locationRequestVersion;
    this.setData(this.data.locationMode === "none"
      ? { regionLabel: "正在定位", regionSub: "获取附近地点", locationLoading: true }
      : { locationLoading: true });
    try {
      const point = await locationAdapter.requestLocation();
      if (requestVersion !== locationRequestVersion) return;
      locationAdapter.setUserLocation(point);
      locationAdapter.clearHomeSelectedPlace();
      this.applyLocation(point, "正在解析地点", "gps", "请稍候");
      if (recenterMap) this.restoreMapView(point);
      reverseGeocodeByWebService(point).then((place) => {
        if (requestVersion !== locationRequestVersion
          || this.data.locationMode !== "gps"
          || this.data.mapLat !== point.latitude
          || this.data.mapLng !== point.longitude) return;
        homeDemoFleet.setAnchorLabel(place.name);
        this.setData({ regionLabel: place.name, regionSub: place.address === place.name ? "点击选择地点" : place.address });
      }).catch((error) => {
        if (requestVersion !== locationRequestVersion) return;
        console.warn("[home] reverse geocoding failed", {
          code: (error as any)?.code,
          status: (error as any)?.status,
          message: (error as any)?.message,
        });
        if (this.data.locationMode === "gps" && this.data.mapLat === point.latitude && this.data.mapLng === point.longitude) {
          this.setData({ regionLabel: "点击选择地点", regionSub: "地图已定位，点此选择地点名称" });
        }
      });
    } catch (error) {
      if (requestVersion !== locationRequestVersion) return;
      console.warn("[home] wx.getLocation failed", error);
      if (this.data.locationMode === "none") {
        this.setData({ hasRealLocation: false, locationLoading: false, regionSub: "定位失败，点击重试" });
      } else {
        this.setData({ locationLoading: false });
      }
      const message = String((error as any)?.errMsg ?? "");
      if (message.includes("auth deny") || message.includes("authorize")) {
        wx.showModal({
          title: "需要定位权限",
          content: "允许微信访问位置信息后，才能显示您附近的运力。",
          success: (result) => { if (result.confirm) wx.openSetting({ success: () => this.refreshLocation() }); },
        });
      }
    }
  },

  restoreMapView(point: { latitude: number; longitude: number }) {
    this.setData({
      mapScale: MAP_DEFAULTS.scale,
      floatActionsOffset: this.data.bottomCardHeight + 12,
    }, () => {
      const move = () => {
        if (typeof wx.createMapContext !== "function") return;
        wx.createMapContext("map", this).moveToLocation({
          latitude: point.latitude,
          longitude: point.longitude,
        });
      };
      if (typeof wx.nextTick === "function") wx.nextTick(move);
      else move();
    });
  },

  refreshDemoFleet(point: { latitude: number; longitude: number }, label: string, randomize = true) {
    const snapshot = randomize
      ? homeDemoFleet.regenerate(point, label)
      : homeDemoFleet.relocate(point, label);
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

  applyLocation(point: { latitude: number; longitude: number }, label: string, mode: "gps" | "selected", detail = "", randomize = false) {
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

  onMarkerTap(e: any) {
    const id = Number(e?.detail?.markerId);
    const vehicle = homeDemoFleet.getSnapshot()?.vehicles.find((item) => item.markerId === id);
    if (vehicle) this.openDemoVehicle(vehicle.id);
  },

  openDemoVehicle(id: string) {
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
        locationAdapter.setHomeSelectedPlace(point, label, place.address || "");
        this.applyLocation(point, label, "selected", place.address || "");
      },
      fail: (error) => {
        if (!String(error?.errMsg ?? "").includes("cancel")) {
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
    if (openingOrder) return;
    openingOrder = true;
    this.setData({ openingOrder: true });
    wx.navigateTo({
      url: "/pages/address-step/index",
      fail: () => { openingOrder = false; this.setData({ openingOrder: false }); },
    });
  },
}));
