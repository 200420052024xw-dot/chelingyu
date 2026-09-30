"use strict";
/** 定位适配层：真实位置只来自微信定位接口。 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationAdapter = void 0;
const index_1 = require("../config/index");
let cachedUserLocation = null;
let cachedPlaceLabel = null;
let cachedHomePlace = null;
exports.locationAdapter = {
    /** 仅供本地业务计算使用的默认地图中心，不代表用户位置。 */
    getDemoLocation() {
        return index_1.APP_CONFIG.demoCenter;
    },
    getUserLocation() {
        return cachedUserLocation || index_1.APP_CONFIG.demoCenter;
    },
    setUserLocation(p) {
        cachedUserLocation = p;
    },
    getSelectedPlace() {
        if (cachedUserLocation && cachedPlaceLabel)
            return { point: cachedUserLocation, label: cachedPlaceLabel };
        try {
            const point = wx.getStorageSync("selectedPlacePoint");
            const label = wx.getStorageSync("selectedPlaceLabel");
            if (point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && label) {
                cachedUserLocation = point;
                cachedPlaceLabel = label;
                return { point, label: cachedPlaceLabel };
            }
        }
        catch (_) { /* storage is optional */ }
        return null;
    },
    setSelectedPlace(point, label) {
        cachedUserLocation = point;
        cachedPlaceLabel = label;
        try {
            wx.setStorageSync("selectedPlacePoint", point);
            wx.setStorageSync("selectedPlaceLabel", label);
        }
        catch (_) { /* storage is optional */ }
    },
    getHomeSelectedPlace() {
        if (cachedHomePlace)
            return cachedHomePlace;
        try {
            const point = wx.getStorageSync("homeSelectedPlacePoint");
            const label = wx.getStorageSync("homeSelectedPlaceLabel");
            const detail = wx.getStorageSync("homeSelectedPlaceDetail");
            if (point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && label) {
                cachedHomePlace = { point, label, detail: detail || "" };
                cachedUserLocation = point;
                return cachedHomePlace;
            }
        }
        catch (_) { /* storage is optional */ }
        return null;
    },
    setHomeSelectedPlace(point, label, detail = "") {
        cachedHomePlace = { point, label, detail };
        cachedUserLocation = point;
        try {
            wx.setStorageSync("homeSelectedPlacePoint", point);
            wx.setStorageSync("homeSelectedPlaceLabel", label);
            wx.setStorageSync("homeSelectedPlaceDetail", detail);
        }
        catch (_) { /* storage is optional */ }
    },
    clearHomeSelectedPlace() {
        cachedHomePlace = null;
        try {
            wx.removeStorageSync("homeSelectedPlacePoint");
            wx.removeStorageSync("homeSelectedPlaceLabel");
            wx.removeStorageSync("homeSelectedPlaceDetail");
        }
        catch (_) { /* storage is optional */ }
    },
    /** 请求真实定位；失败时由调用页面明确处理。 */
    requestLocation() {
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
