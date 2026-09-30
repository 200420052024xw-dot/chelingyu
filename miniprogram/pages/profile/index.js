"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const session_1 = require("../../stores/session");
const owner_1 = require("../../services/owner");
const notification_1 = require("../../services/notification");
const address_1 = require("../../services/address");
const order_1 = require("../../services/order");
const local_database_1 = require("../../repositories/local-database");
const order_2 = require("../../view-models/order");
const index_1 = require("../../repositories/index");
const page_performance_1 = require("../../utils/page-performance");
const instance = {};
Page((0, page_performance_1.withPagePerformance)("profile", {
    data: {
        nickname: "",
        authenticated: false,
        identity: "customer",
        unreadCount: 0,
        defaultSender: null,
        defaultReceiver: null,
        vehicleCount: 0,
        activeOrderCount: 0,
        completedOrderCount: 0,
        pendingEarningsFen: 0,
        settledEarningsFen: 0,
    },
    onLoad() {
        this.refresh();
        instance.unsubscribe = (0, local_database_1.subscribeDB)(() => this.refresh());
    },
    onUnload() {
        var _a;
        (_a = instance.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(instance);
    },
    refresh() {
        var _a, _b, _c, _d, _e, _f, _g;
        const session = session_1.sessionStore.snapshot();
        const user = session.currentUserId ? index_1.repo.getUser(session.currentUserId) : undefined;
        if (!user) {
            this.setData({
                nickname: "未登录",
                authenticated: false,
                identity: "customer",
                unreadCount: 0,
                defaultSender: null,
                defaultReceiver: null,
                vehicleCount: 0,
                activeOrderCount: 0,
                completedOrderCount: 0,
                pendingEarningsFen: 0,
                settledEarningsFen: 0,
            });
            return;
        }
        const addrs = address_1.addressService.list();
        const sender = (_b = (_a = addrs.find((a) => a.isDefaultSender)) !== null && _a !== void 0 ? _a : addrs[0]) !== null && _b !== void 0 ? _b : null;
        const receiver = (_e = (_d = (_c = addrs.find((a) => a.isDefaultReceiver)) !== null && _c !== void 0 ? _c : addrs[1]) !== null && _d !== void 0 ? _d : addrs[0]) !== null && _e !== void 0 ? _e : null;
        const vehicles = owner_1.ownerService.listVehicles();
        const orders = order_1.orderService.list();
        const earnings = owner_1.ownerService.earnings();
        this.setData({
            nickname: user.nickname,
            authenticated: true,
            identity: session.identity,
            unreadCount: notification_1.notificationService.unreadCount(),
            defaultSender: (_f = sender === null || sender === void 0 ? void 0 : sender.name) !== null && _f !== void 0 ? _f : null,
            defaultReceiver: (_g = receiver === null || receiver === void 0 ? void 0 : receiver.name) !== null && _g !== void 0 ? _g : null,
            vehicleCount: vehicles.length,
            activeOrderCount: orders.filter((o) => !["completed", "cancelled", "failed"].includes(o.status)).length,
            completedOrderCount: orders.filter((o) => o.status === "completed").length,
            pendingEarningsFen: earnings.pendingFen,
            settledEarningsFen: earnings.settledFen,
        });
    },
    onSwitchIdentity(e) {
        if (!this.data.authenticated)
            return;
        const id = e.currentTarget.dataset.id;
        session_1.sessionStore.switchIdentity(id);
        this.refresh();
    },
    onOpenAddresses() {
        wx.navigateTo({ url: "/packages/delivery/pages/addresses/index" });
    },
    onOpenVehicles() {
        wx.navigateTo({ url: "/packages/owner/pages/vehicles/index" });
    },
    onOpenMessages() {
        wx.navigateTo({ url: "/packages/account/pages/messages/index" });
    },
    onOpenSupport() {
        wx.navigateTo({ url: "/packages/account/pages/support/index" });
    },
    onOpenSettings() {
        wx.navigateTo({ url: "/packages/account/pages/settings/index" });
    },
    onOpenOrders() {
        wx.switchTab({ url: "/pages/orders/index" });
    },
    onOpenEarnings() {
        wx.navigateTo({ url: "/packages/owner/pages/earnings/index" });
    },
    formatMoney(f) {
        return (0, order_2.formatMoneyFen)(f);
    },
}));
