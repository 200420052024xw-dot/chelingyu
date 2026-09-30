/** 本地存储适配层 */

// 业务记录保存在微信小程序本机缓存，沿用原键以保留已有订单和地址。
const PREFIX = "cly:prototype:v1";

export const storageKeys = {
  database: `${PREFIX}:db`,
  currentUser: `${PREFIX}:currentUser`,
  session: `${PREFIX}:session`,
  notificationPrefs: `${PREFIX}:notifPrefs`,
};

export const storage = {
  read<T>(key: string, fallback: T): T {
    try {
      const raw = wx.getStorageSync(key);
      if (raw === "" || raw === undefined || raw === null) return fallback;
      return raw as T;
    } catch (e) {
      console.warn("[storage.read] failed", key, e);
      return fallback;
    }
  },

  write(key: string, value: unknown): void {
    try {
      wx.setStorageSync(key, value);
    } catch (e) {
      console.warn("[storage.write] failed", key, e);
    }
  },

  remove(key: string): void {
    try {
      wx.removeStorageSync(key);
    } catch (e) {
      console.warn("[storage.remove] failed", key, e);
    }
  },

  clearAll(): void {
    try {
      wx.clearStorageSync();
    } catch (e) {
      console.warn("[storage.clearAll] failed", e);
    }
  },
};
