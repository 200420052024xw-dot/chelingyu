import { sessionStore } from "../../stores/session";
import { ownerService } from "../../services/owner";
import { notificationService } from "../../services/notification";
import { addressService } from "../../services/address";
import { orderService } from "../../services/order";
import { subscribeDB } from "../../repositories/local-database";
import { formatMoneyFen } from "../../view-models/order";
import { repo } from "../../repositories/index";
import { withPagePerformance } from "../../utils/page-performance";

interface PageData {
  nickname: string;
  authenticated: boolean;
  identity: "customer" | "vehicle_owner";
  unreadCount: number;
  defaultSender: string | null;
  defaultReceiver: string | null;
  vehicleCount: number;
  activeOrderCount: number;
  completedOrderCount: number;
  pendingEarningsFen: number;
  settledEarningsFen: number;
}

interface PageInstance {
  unsubscribe?: () => void;
}

const instance: PageInstance = {};

Page<PageData, any>(withPagePerformance<PageData, any>("profile", {
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
    instance.unsubscribe = subscribeDB(() => this.refresh());
  },

  onUnload() {
    instance.unsubscribe?.();
  },

  refresh() {
    const session = sessionStore.snapshot();
    const user = session.currentUserId ? repo.getUser(session.currentUserId) : undefined;
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
    const addrs = addressService.list();
    const sender = addrs.find((a) => a.isDefaultSender) ?? addrs[0] ?? null;
    const receiver = addrs.find((a) => a.isDefaultReceiver) ?? addrs[1] ?? addrs[0] ?? null;
    const vehicles = ownerService.listVehicles();
    const orders = orderService.list();
    const earnings = ownerService.earnings();
    this.setData({
      nickname: user.nickname,
      authenticated: true,
      identity: session.identity,
      unreadCount: notificationService.unreadCount(),
      defaultSender: sender?.name ?? null,
      defaultReceiver: receiver?.name ?? null,
      vehicleCount: vehicles.length,
      activeOrderCount: orders.filter((o) => !["completed", "cancelled", "failed"].includes(o.status)).length,
      completedOrderCount: orders.filter((o) => o.status === "completed").length,
      pendingEarningsFen: earnings.pendingFen,
      settledEarningsFen: earnings.settledFen,
    });
  },

  onSwitchIdentity(e: any) {
    if (!this.data.authenticated) return;
    const id = e.currentTarget.dataset.id as "customer" | "vehicle_owner";
    sessionStore.switchIdentity(id);
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

  formatMoney(f: number) {
    return formatMoneyFen(f);
  },
}));
