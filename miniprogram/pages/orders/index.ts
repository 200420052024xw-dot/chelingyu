import type { OrderStatus } from "../../contracts/types";
import { orderService } from "../../services/order";
import { subscribeDB } from "../../repositories/local-database";
import { formatMoneyFen, statusBadge } from "../../view-models/order";
import { formatDateTime } from "../../adapters/clock";
import { withPagePerformance } from "../../utils/page-performance";
import { isSharedMode, sharedOrders } from "../../services/remote";

interface PageData {
  loading: boolean;
  filter: "payment" | "in_progress" | "completed" | "all";
  list: Array<{
    id: string;
    orderNo: string;
    status: OrderStatus;
    statusBadge: { text: string; tone: string };
    totalAmountFen: number;
    sender: string;
    senderDetail: string;
    receiver: string;
    receiverDetail: string;
    vehicleModelName: string;
    dispatchSourceLabel: string;
    scheduledLabel: string;
    actionLabel: string;
  }>;
  tabs: Array<{ key: string; label: string }>;
}

interface PageInstance {
  unsubscribe?: () => void;
  initialized?: boolean;
}

const instance: PageInstance = {};

Page<PageData, any>(withPagePerformance<PageData, any>("orders", {
  data: {
    loading: true,
    filter: "payment",
    list: [],
    tabs: [
      { key: "payment", label: "待支付" },
      { key: "in_progress", label: "进行中" },
      { key: "completed", label: "已完成" },
      { key: "all", label: "全部" },
    ],
  },

  onLoad() {
    instance.initialized = false;
    this.refresh();
    instance.unsubscribe = subscribeDB(() => this.refresh());
  },

  onShow() {
    if (isSharedMode()) { this.refresh(); return; }
    orderService.list({ status: "active" }).forEach((order) => {
      if (order.serviceTimeMode === "scheduled" || order.dispatchSource === "headquarters") orderService.dispatchReadyOrder(order.id);
    });
    this.refresh();
  },

  onUnload() {
    instance.unsubscribe?.();
  },

  async refresh() {
    try {
    const all = isSharedMode() ? await sharedOrders.list("all") : orderService.list({ status: "all" });
    const filter = instance.initialized ? this.data.filter : all.some(o=>["pending_payment","pending_customer_quote"].includes(o.status)) ? "payment" : "in_progress";
    instance.initialized = true;
    const orders = all.filter(o=>filter==="all" || (filter==="payment" ? ["pending_payment","pending_customer_quote"].includes(o.status) : filter==="in_progress" ? !["pending_payment","pending_customer_quote","completed","cancelled","failed"].includes(o.status) : o.status==="completed"));
    const list = orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      status: o.status,
      statusBadge: statusBadge(o.status),
      totalAmountFen: o.totalAmountFen,
      sender: o.sender.name,
      senderDetail: o.sender.detail,
      receiver: o.receiver.name,
      receiverDetail: o.receiver.detail,
      vehicleModelName: o.vehicleSnapshot.modelName,
      dispatchSourceLabel: o.dispatchSource === "headquarters" || o.dispatchSource === "platform" ? "平台调度" : "附近车辆",
      scheduledLabel: o.scheduledPickupAt
        ? `预约用车 ${formatDateTime(o.scheduledPickupAt)}`
        : `立即用车 ${formatDateTime(o.createdAt)}`,
      actionLabel: o.status === "pending_payment" ? "去支付" : o.status === "pending_customer_quote" ? "确认新报价" : o.status === "awaiting_loading" ? "去确认装货" : o.status === "arrived" ? "去确认收货" : ["completed", "cancelled", "failed"].includes(o.status) ? "查看详情" : "查看进度",
    }));
    this.setData({ list, filter, loading: false });
    } catch (error: any) {
      this.setData({ loading: false });
      wx.showToast({ title: error?.message || "订单加载失败", icon: "none" });
    }
  },

  onTabChange(e: any) {
    this.setData({ filter: e.currentTarget.dataset.key });
    this.refresh();
  },

  onOpenDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/packages/delivery/pages/detail/index?id=${id}` });
  },

  onPrimaryAction(e: any) { this.onOpenDetail(e); },

  formatMoney(f: number) {
    return formatMoneyFen(f);
  },
}));
