import { withPagePerformance } from "../../../../utils/page-performance";
import { sessionStore } from "../../../../stores/session";
import { resetDB } from "../../../../repositories/local-database";
import {
  clock,
  advanceDemoClock,
  resetDemoClock,
  getOverrideLabel,
} from "../../../../adapters/clock";
import { APP_CONFIG } from "../../../../config/index";
import { storage, storageKeys } from "../../../../adapters/storage";

interface PageData {
  identity: "customer" | "vehicle_owner";
  identityLabel: string;
  notifOrder: boolean;
  notifSystem: boolean;
  clockOverride: string;
  appName: string;
  appVersion: string;
  buildInfo: string;
}

const APP_VERSION = "1.0.0";

Page<PageData, any>(withPagePerformance<PageData, any>("packages/account/pages/settings/index", {
  data: {
    identity: "customer",
    identityLabel: "下单用户",
    notifOrder: true,
    notifSystem: true,
    clockOverride: "",
    appName: APP_CONFIG.appName,
    appVersion: APP_VERSION,
    buildInfo: "本机存储 · 业务数据模拟",
  },

  onLoad() {
    this.refresh();
    this._skipFirstShow = true;
  },

  onShow() {
    if (this._skipFirstShow) {
      this._skipFirstShow = false;
      return;
    }
    this.refresh();
  },

  refresh() {
    const identity = sessionStore.getIdentity();
    const notifPrefs = storage.read<{ order: boolean; system: boolean }>(storageKeys.notificationPrefs, {
      order: true,
      system: true,
    });
    this.setData({
      identity,
      identityLabel: identity === "customer" ? "下单用户" : "车主",
      notifOrder: notifPrefs.order,
      notifSystem: notifPrefs.system,
      clockOverride: getOverrideLabel(),
    });
  },

  onSwitchIdentity(e: any) {
    const identity = e.currentTarget.dataset.key as "customer" | "vehicle_owner";
    sessionStore.switchIdentity(identity);
    this.refresh();
    wx.showToast({ title: "已切换身份", icon: "success" });
  },

  onToggleNotif(e: any) {
    const key = e.currentTarget.dataset.key as "order" | "system";
    const value = e.detail.value;
    const current = storage.read<{ order: boolean; system: boolean }>(storageKeys.notificationPrefs, {
      order: true,
      system: true,
    });
    storage.write(storageKeys.notificationPrefs, { ...current, [key]: value });
    this.setData({ [key === "order" ? "notifOrder" : "notifSystem"]: value } as any);
  },

  onAdvanceClock() {
    advanceDemoClock(30);
    this.refresh();
    wx.showToast({ title: "已推进 30 分钟", icon: "none" });
  },

  onResetClock() {
    resetDemoClock();
    this.refresh();
    wx.showToast({ title: "时钟已重置", icon: "none" });
  },

  onResetData() {
    wx.showModal({
      title: "重置本地数据",
      content: "将清空本机订单、地址和设置并恢复初始数据，是否继续？",
      success: (res) => {
        if (res.confirm) {
          resetDB();
          wx.showToast({ title: "已重置", icon: "success" });
          setTimeout(() => {
            wx.reLaunch({ url: "/pages/home/index" });
          }, 600);
        }
      },
    });
  },

  onOpenAgreement() {
    wx.showModal({
      title: "服务协议",
      content: "当前业务流程使用本机模拟数据，不产生线上交易；订单记录保存在当前设备的微信小程序缓存中。",
      showCancel: false,
    });
  },

  onOpenPrivacy() {
    wx.showModal({
      title: "隐私政策",
      content: "定位由微信定位接口获取，用于地图展示；订单、地址和设置保存在当前设备的微信小程序缓存中，未接入远端同步。",
      showCancel: false,
    });
  },
}));
