/** 定位适配层：真实位置只来自微信定位接口。 */

import type { GeoPoint } from "../contracts/types";
import { APP_CONFIG } from "../config/index";

let cachedUserLocation: GeoPoint | null = null;
let cachedPlaceLabel: string | null = null;
let cachedHomePlace: { point: GeoPoint; label: string; detail: string } | null = null;

export const locationAdapter = {
  /** 仅供本地业务计算使用的默认地图中心，不代表用户位置。 */
  getDemoLocation(): GeoPoint {
    return APP_CONFIG.demoCenter;
  },

  getUserLocation(): GeoPoint {
    return cachedUserLocation || APP_CONFIG.demoCenter;
  },

  setUserLocation(p: GeoPoint): void {
    cachedUserLocation = p;
  },

  getSelectedPlace(): { point: GeoPoint; label: string } | null {
    if (cachedUserLocation && cachedPlaceLabel) return { point: cachedUserLocation, label: cachedPlaceLabel };
    try {
      const point = wx.getStorageSync("selectedPlacePoint") as GeoPoint | undefined;
      const label = wx.getStorageSync("selectedPlaceLabel") as string | undefined;
      if (point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && label) {
        cachedUserLocation = point;
        cachedPlaceLabel = label;
        return { point, label: cachedPlaceLabel };
      }
    } catch (_) { /* storage is optional */ }
    return null;
  },

  setSelectedPlace(point: GeoPoint, label: string): void {
    cachedUserLocation = point;
    cachedPlaceLabel = label;
    try {
      wx.setStorageSync("selectedPlacePoint", point);
      wx.setStorageSync("selectedPlaceLabel", label);
    } catch (_) { /* storage is optional */ }
  },

  getHomeSelectedPlace(): { point: GeoPoint; label: string; detail: string } | null {
    if (cachedHomePlace) return cachedHomePlace;
    try {
      const point = wx.getStorageSync("homeSelectedPlacePoint") as GeoPoint | undefined;
      const label = wx.getStorageSync("homeSelectedPlaceLabel") as string | undefined;
      const detail = wx.getStorageSync("homeSelectedPlaceDetail") as string | undefined;
      if (point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && label) {
        cachedHomePlace = { point, label, detail: detail || "" };
        cachedUserLocation = point;
        return cachedHomePlace;
      }
    } catch (_) { /* storage is optional */ }
    return null;
  },

  setHomeSelectedPlace(point: GeoPoint, label: string, detail = ""): void {
    cachedHomePlace = { point, label, detail };
    cachedUserLocation = point;
    try {
      wx.setStorageSync("homeSelectedPlacePoint", point);
      wx.setStorageSync("homeSelectedPlaceLabel", label);
      wx.setStorageSync("homeSelectedPlaceDetail", detail);
    } catch (_) { /* storage is optional */ }
  },

  clearHomeSelectedPlace(): void {
    cachedHomePlace = null;
    try {
      wx.removeStorageSync("homeSelectedPlacePoint");
      wx.removeStorageSync("homeSelectedPlaceLabel");
      wx.removeStorageSync("homeSelectedPlaceDetail");
    } catch (_) { /* storage is optional */ }
  },

  /** 请求真实定位；失败时由调用页面明确处理。 */
  requestLocation(): Promise<GeoPoint> {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: "gcj02",
        success: (res) => {
          resolve({ latitude: res.latitude, longitude: res.longitude });
        },
        fail: reject,
      });
    });
  },
};
