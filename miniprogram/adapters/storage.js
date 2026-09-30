"use strict";
/** 本地存储适配层 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.storageKeys = void 0;
// 业务记录保存在微信小程序本机缓存，沿用原键以保留已有订单和地址。
const PREFIX = "cly:prototype:v1";
exports.storageKeys = {
    database: `${PREFIX}:db`,
    currentUser: `${PREFIX}:currentUser`,
    session: `${PREFIX}:session`,
    notificationPrefs: `${PREFIX}:notifPrefs`,
};
exports.storage = {
    read(key, fallback) {
        try {
            const raw = wx.getStorageSync(key);
            if (raw === "" || raw === undefined || raw === null)
                return fallback;
            return raw;
        }
        catch (e) {
            console.warn("[storage.read] failed", key, e);
            return fallback;
        }
    },
    write(key, value) {
        try {
            wx.setStorageSync(key, value);
        }
        catch (e) {
            console.warn("[storage.write] failed", key, e);
        }
    },
    remove(key) {
        try {
            wx.removeStorageSync(key);
        }
        catch (e) {
            console.warn("[storage.remove] failed", key, e);
        }
    },
    clearAll() {
        try {
            wx.clearStorageSync();
        }
        catch (e) {
            console.warn("[storage.clearAll] failed", e);
        }
    },
};
