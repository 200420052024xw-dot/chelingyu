"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_performance_1 = require("../../../../utils/page-performance");
const session_1 = require("../../../../stores/session");
const local_database_1 = require("../../../../repositories/local-database");
const clock_1 = require("../../../../adapters/clock");
const index_1 = require("../../../../config/index");
const storage_1 = require("../../../../adapters/storage");
const APP_VERSION = "1.0.0";
Page((0, page_performance_1.withPagePerformance)("packages/account/pages/settings/index", {
    data: {
        identity: "customer",
        identityLabel: "下单用户",
        notifOrder: true,
        notifSystem: true,
        clockOverride: "",
        appName: index_1.APP_CONFIG.appName,
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
        const identity = session_1.sessionStore.getIdentity();
        const notifPrefs = storage_1.storage.read(storage_1.storageKeys.notificationPrefs, {
            order: true,
            system: true,
        });
        this.setData({
            identity,
            identityLabel: identity === "customer" ? "下单用户" : "车主",
            notifOrder: notifPrefs.order,
            notifSystem: notifPrefs.system,
            clockOverride: (0, clock_1.getOverrideLabel)(),
        });
    },
    onSwitchIdentity(e) {
        const identity = e.currentTarget.dataset.key;
        session_1.sessionStore.switchIdentity(identity);
        this.refresh();
        wx.showToast({ title: "已切换身份", icon: "success" });
    },
    onToggleNotif(e) {
        const key = e.currentTarget.dataset.key;
        const value = e.detail.value;
        const current = storage_1.storage.read(storage_1.storageKeys.notificationPrefs, {
            order: true,
            system: true,
        });
        storage_1.storage.write(storage_1.storageKeys.notificationPrefs, Object.assign(Object.assign({}, current), { [key]: value }));
        this.setData({ [key === "order" ? "notifOrder" : "notifSystem"]: value });
    },
    onAdvanceClock() {
        (0, clock_1.advanceDemoClock)(30);
        this.refresh();
        wx.showToast({ title: "已推进 30 分钟", icon: "none" });
    },
    onResetClock() {
        (0, clock_1.resetDemoClock)();
        this.refresh();
        wx.showToast({ title: "时钟已重置", icon: "none" });
    },
    onResetData() {
        wx.showModal({
            title: "重置本地数据",
            content: "将清空本机订单、地址和设置并恢复初始数据，是否继续？",
            success: (res) => {
                if (res.confirm) {
                    (0, local_database_1.resetDB)();
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
