import type { DeliveryOrder, OrderDetailView, OrderStatusEvent } from "../../../../contracts/types";
import { repo } from "../../../../repositories/index";
import { orderService, OrderError } from "../../../../services/order";
import { paymentService } from "../../../../services/payment";
import { sessionStore } from "../../../../stores/session";
import { subscribeDB } from "../../../../repositories/local-database";
import { formatMoneyFen, statusBadge, statusHint, timelineEventLabel, formatEventTime } from "../../../../view-models/order";
import { identity } from "../../../../adapters/identity";
import { advanceDemoClock } from "../../../../adapters/clock";
import { withPagePerformance } from "../../../../utils/page-performance";

interface PageData {
  orderId: string;
  loading: boolean;
  view: OrderDetailView | null;
  cancelModalOpen: boolean;
  cancelReason: string;
  payProcessing: boolean;
  statusBadge: { text: string; tone: string };
  statusHint: string;
  statusIcon: string;
  statusStepIndex: number;
  orderSteps: Array<{ key: string; label: string }>;
  timeline: Array<{ label: string; time: string; isCurrent: boolean; isFuture: boolean; actor: string }>;
  // 演示：取消原因
  cancelReasons: Array<{ label: string; value: string }>;
}

const ORDER_STEPS: Array<{ key: string; label: string }> = [
  { key: "pending_payment", label: "待支付" },
  { key: "paid", label: "已支付" },
  { key: "matching", label: "匹配车辆" },
  { key: "dispatched", label: "已派车" },
  { key: "vehicle_to_pickup", label: "前往取件" },
  { key: "awaiting_loading", label: "等待装货" },
  { key: "delivering", label: "配送中" },
  { key: "arrived", label: "已到达" },
  { key: "completed", label: "已完成" },
];

const STATUS_ICONS: Record<string, string> = {
  pending_payment: "/assets/icons/money.png",
  paid: "/assets/icons/check.png",
  matching: "/assets/icons/search.png",
  dispatched: "/assets/icons/box.png",
  vehicle_to_pickup: "/assets/icons/vehicle.png",
  awaiting_loading: "/assets/icons/box.png",
  delivering: "/assets/icons/route.png",
  arrived: "/assets/icons/location.png",
  completed: "/assets/icons/pay-success.png",
  cancelled: "/assets/icons/close.png",
  failed: "/assets/icons/pay-fail.png",
};

interface PageInstance {
  unsubscribe?: () => void;
}

const detailPageInstance: PageInstance = {};

Page<PageData, any>(withPagePerformance<PageData, any>("delivery/detail", {
  data: {
    orderId: "",
    loading: true,
    view: null,
    cancelModalOpen: false,
    cancelReason: "",
    payProcessing: false,
    statusBadge: { text: "", tone: "neutral" },
    statusHint: "",
    statusIcon: "/assets/icons/box.png",
    statusStepIndex: 0,
    orderSteps: ORDER_STEPS,
    timeline: [],
    cancelReasons: [
      { label: "临时改变计划", value: "临时改变计划" },
      { label: "信息填写错误", value: "信息填写错误" },
      { label: "其他原因", value: "其他原因" },
    ],
  },

  onLoad(query) {
    const orderId = query?.id as string;
    this.setData({ orderId });
    this.refresh();
    detailPageInstance.unsubscribe = subscribeDB(() => this.refresh());
  },

  onUnload() {
    detailPageInstance.unsubscribe?.();
  },

  refresh() {
    try {
      const view = orderService.detail(this.data.orderId);
      const timeline = this.buildTimeline(view.order, view.events);
      const stepIndex = ORDER_STEPS.findIndex((s) => s.key === view.order.status);
      this.setData({
        view,
        loading: false,
        statusBadge: statusBadge(view.order.status),
        statusHint: view.order.dispatchSource === "headquarters"
          ? (view.order.status === "pending_payment" ? "总部已确认可调车，完成支付后进入调度" : "总部调车申请已确认，预计时间以调度联系为准")
          : statusHint(view.order.status),
        statusIcon: STATUS_ICONS[view.order.status] || "/assets/icons/box.png",
        statusStepIndex: stepIndex >= 0 ? stepIndex : 0,
        timeline,
      });
    } catch (e: any) {
      this.setData({ loading: false });
    }
  },

  buildTimeline(order: DeliveryOrder, events: OrderStatusEvent[]) {
    const sortedEvents = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    const items = sortedEvents.map((e) => ({
      label: timelineEventLabel(e),
      time: formatEventTime(e),
      isCurrent: false,
      isFuture: false,
      actor: e.actorType,
    }));

    return items.map((it, idx) => ({
      ...it,
      isCurrent: idx === items.length - 1 && !["completed", "cancelled", "failed"].includes(order.status),
      isFuture: false,
    }));
  },

  formatMoney(f: number) {
    return formatMoneyFen(f);
  },

  async onPay() {
    if (!this.data.view) return;
    this.setData({ payProcessing: true });
    setTimeout(() => {
      try {
        paymentService.payMock({
          orderId: this.data.view!.order.id,
          requestId: identity.newRequestId(),
          scenario: "success",
        });
        this.setData({ payProcessing: false });
        this.refresh();
      } catch (e: any) {
        wx.showToast({ title: e.message || "支付失败", icon: "none" });
        this.setData({ payProcessing: false });
      }
    }, 600);
  },

  onAdvance() {
    try {
      orderService.advance({ orderId: this.data.orderId });
      this.refresh();
      wx.showToast({ title: "已推进订单", icon: "success" });
    } catch (e: any) {
      wx.showToast({ title: e.message || "推进失败", icon: "none" });
    }
  },

  onConfirmLoaded() {
    try {
      orderService.confirmLoaded(this.data.orderId);
      this.refresh();
    } catch (e: any) {
      wx.showToast({ title: e.message || "操作失败", icon: "none" });
    }
  },

  onConfirmReceived() {
    wx.showModal({
      title: "确认收货",
      content: "请确认已收到货物，本次操作不可撤销",
      success: (r) => {
        if (r.confirm) {
          try {
            orderService.confirmReceived(this.data.orderId);
            this.refresh();
          } catch (e: any) {
            wx.showToast({ title: e.message || "操作失败", icon: "none" });
          }
        }
      },
    });
  },

  onOpenCancel() {
    this.setData({ cancelModalOpen: true, cancelReason: "临时改变计划" });
  },

  onCloseCancel() {
    this.setData({ cancelModalOpen: false });
  },

  onPickCancelReason(e: any) {
    this.setData({ cancelReason: e.currentTarget.dataset.value });
  },

  onConfirmCancel() {
    try {
      orderService.cancel({
        orderId: this.data.orderId,
        reason: this.data.cancelReason,
      });
      this.setData({ cancelModalOpen: false });
      this.refresh();
    } catch (e: any) {
      wx.showToast({ title: e.message || "取消失败", icon: "none" });
    }
  },

  onCallSupport() {
    wx.navigateTo({ url: `/packages/account/pages/support/index?orderId=${this.data.orderId}` });
  },

  onAdvanceClock() {
    advanceDemoClock(10);
    wx.showToast({ title: "模拟时间 +10 分钟", icon: "none" });
  },

  onRetryPay() {
    this.onPay();
  },
}));
