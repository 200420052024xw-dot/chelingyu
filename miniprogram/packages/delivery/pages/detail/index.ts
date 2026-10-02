import type { DeliveryOrder, OrderDetailView, OrderStatusEvent } from "../../../../contracts/types";
import { repo } from "../../../../repositories/index";
import { orderService, OrderError } from "../../../../services/order";
import { paymentService } from "../../../../services/payment";
import { sessionStore } from "../../../../stores/session";
import { subscribeDB } from "../../../../repositories/local-database";
import { formatMoneyFen, statusBadge, statusHint, timelineEventLabel, formatEventTime, customerOrderStage } from "../../../../view-models/order";
import { identity } from "../../../../adapters/identity";
import { formatDateTime } from "../../../../adapters/clock";
import { withPagePerformance } from "../../../../utils/page-performance";
import { isSharedMode, sharedOrders } from "../../../../services/remote";
import { locationAdapter } from "../../../../adapters/location";
import { haversineMeters } from "../../../../adapters/geo";

interface PageData {
  orderId: string;
  loading: boolean;
  view: OrderDetailView | null;
  cancelModalOpen: boolean;
  progressOpen: boolean;
  distanceLabel: string;
  cancelReason: string;
  payProcessing: boolean;
  statusBadge: { text: string; tone: string };
  statusHint: string;
  statusIcon: string;
  statusStepIndex: number;
  progressTerminal: boolean;
  orderSteps: Array<{ key: string; label: string }>;
  scheduledPickupLabel: string;
  timeline: Array<{ label: string; time: string; note: string; isCurrent: boolean; isFuture: boolean; actor: string }>;
  mapVisible: boolean;
  mapLatitude: number;
  mapLongitude: number;
  mapMarkers: any[];
  mapPolyline: any[];
  // 演示：取消原因
  cancelReasons: Array<{ label: string; value: string }>;
}

const ORDER_STEPS: Array<{ key: string; label: string }> = [
  { key: "created", label: "下单" },
  { key: "payment", label: "支付" },
  { key: "pickup", label: "取件" },
  { key: "delivery", label: "配送" },
  { key: "completed", label: "完成" },
];

const STATUS_ICONS: Record<string, string> = {
  pending_headquarters_review: "/assets/icons/tabler/clock-hour-4.svg",
  pending_dispatch_review: "/assets/icons/tabler/clock-hour-4.svg",
  pending_customer_quote: "/assets/icons/tabler/clock-hour-4.svg",
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
  poll?: ReturnType<typeof setInterval>;
  userPoint?: { latitude: number; longitude: number };
}

const detailPageInstance: PageInstance = {};

Page<PageData, any>(withPagePerformance<PageData, any>("delivery/detail", {
  data: {
    orderId: "",
    loading: true,
    view: null,
    cancelModalOpen: false,
    progressOpen: false,
    distanceLabel: "距离暂不可用",
    cancelReason: "",
    payProcessing: false,
    statusBadge: { text: "", tone: "neutral" },
    statusHint: "",
    statusIcon: "/assets/icons/box.png",
    statusStepIndex: 0,
    progressTerminal: false,
    orderSteps: ORDER_STEPS,
    scheduledPickupLabel: "",
    timeline: [],
    mapVisible: false,
    mapLatitude: 28.6829,
    mapLongitude: 115.8582,
    mapMarkers: [],
    mapPolyline: [],
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
    if (!isSharedMode()) detailPageInstance.unsubscribe = subscribeDB(() => this.refresh());
  },

  onShow() {
    if (this.data.orderId) {
      if (!isSharedMode()) orderService.dispatchReadyOrder(this.data.orderId);
      locationAdapter.requestLocation().then(point => { detailPageInstance.userPoint=point; this.refresh(); }).catch(() => { detailPageInstance.userPoint=undefined; this.setData({distanceLabel:"距离暂不可用"}); });
      this.refresh();
      detailPageInstance.poll = setInterval(() => this.refresh(), 15000);
    }
  },

  onHide() { if (detailPageInstance.poll) clearInterval(detailPageInstance.poll); detailPageInstance.poll = undefined; },

  onUnload() {
    detailPageInstance.unsubscribe?.();
    if (detailPageInstance.poll) clearInterval(detailPageInstance.poll);
    detailPageInstance.userPoint = undefined;
  },

  async refresh() {
    try {
      const view = isSharedMode() ? await sharedOrders.detail(this.data.orderId) : orderService.detail(this.data.orderId);
      const timeline = this.buildTimeline(view.order, view.events);
      const stepIndex = customerOrderStage(view.order.status, view.events);
      const endingEvent = [...view.events].reverse().find((event) => event.toStatus === view.order.status);
      const endingReason = endingEvent?.note || view.order.dispatchReviewReason || view.order.headquartersReviewReason;
      const map = this.buildMap(view);
      const vehiclePoint = map.mapMarkers[2];
      const meters = vehiclePoint && detailPageInstance.userPoint ? haversineMeters(detailPageInstance.userPoint, vehiclePoint) : undefined;
      const distanceLabel = meters === undefined ? "距离暂不可用" : `演示位置 · 距你约 ${meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`}`;
      this.setData({
        view,
        loading: false,
        orderSteps: ORDER_STEPS,
        scheduledPickupLabel: view.order.scheduledPickupAt ? formatDateTime(view.order.scheduledPickupAt) : "",
        statusBadge: statusBadge(view.order.status),
        statusHint: view.order.status === "cancelled" && view.order.cancellationReason
          ? `取消原因：${view.order.cancellationReason}`
          : view.order.status === "failed" && endingReason
          ? `异常原因：${endingReason}`
          : view.order.status === "matching" && (view.order.dispatchSource === "platform" || view.order.dispatchSource === "headquarters")
          ? "平台正在协调可用车辆"
          : statusHint(view.order.status),
        statusIcon: STATUS_ICONS[view.order.status] || "/assets/icons/box.png",
        statusStepIndex: stepIndex,
        progressTerminal: ["completed", "cancelled", "failed"].includes(view.order.status),
        timeline,
        distanceLabel,
        ...map,
      });
    } catch (e: any) {
      this.setData({ loading: false });
      if (isSharedMode()) wx.showToast({ title: e?.message || "订单加载失败", icon: "none" });
    }
  },

  buildMap(view: OrderDetailView) {
    const vehicle = view.assignedVehiclePublic;
    if (!vehicle) return { mapVisible: false, mapLatitude: 28.6829, mapLongitude: 115.8582, mapMarkers: [], mapPolyline: [] };
    const start = vehicle.location;
    const pickup = view.order.sender.location;
    const dropoff = view.order.receiver.location;
    const interpolate = (a: typeof start, b: typeof start, fraction: number) => ({ latitude: a.latitude + (b.latitude - a.latitude) * fraction, longitude: a.longitude + (b.longitude - a.longitude) * fraction });
    const status = view.order.status;
    const latest = [...view.events].reverse().find(e => e.toStatus === status);
    const elapsed = latest ? Math.max(0, Date.now() - Date.parse(latest.occurredAt)) : 0;
    let position = start;
    if (status === "vehicle_to_pickup") position = interpolate(start, pickup, Math.min(0.9, elapsed / (10 * 60000)));
    else if (status === "awaiting_loading") position = pickup;
    else if (status === "delivering") position = interpolate(pickup, dropoff, Math.min(0.9, elapsed / (25 * 60000)));
    else if (["arrived", "completed"].includes(status)) position = dropoff;
    return {
      mapVisible: true,
      mapLatitude: position.latitude,
      mapLongitude: position.longitude,
      mapMarkers: [
        { id: 1, latitude: pickup.latitude, longitude: pickup.longitude, width: 26, height: 26, callout: { content: "取件", display: "ALWAYS", padding: 5, borderRadius: 5 } },
        { id: 2, latitude: dropoff.latitude, longitude: dropoff.longitude, width: 26, height: 26, callout: { content: "送达", display: "ALWAYS", padding: 5, borderRadius: 5 } },
        { id: 3, latitude: position.latitude, longitude: position.longitude, iconPath: "/assets/vehicles/delivery-pod.png", width: 36, height: 36 },
      ],
      mapPolyline: [{ points: [start, pickup, dropoff], color: "#13A765", width: 5, dottedLine: true }],
    };
  },

  buildTimeline(order: DeliveryOrder, events: OrderStatusEvent[]) {
    const sortedEvents = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    const items = sortedEvents.map((e) => ({
      label: timelineEventLabel(e),
      time: formatEventTime(e),
      note: e.note || "",
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
  onOpenProgress() { this.setData({progressOpen:true}); },
  onCloseProgress() { this.setData({progressOpen:false}); },

  async onPay() {
    if (!this.data.view) return;
    this.setData({ payProcessing: true });
    setTimeout(async () => {
      try {
        if (isSharedMode()) await sharedOrders.pay(this.data.view!.order.id, identity.newRequestId(), "success", this.data.view!.order.version);
        else paymentService.payMock({ orderId: this.data.view!.order.id, requestId: identity.newRequestId(), scenario: "success" });
        this.setData({ payProcessing: false });
        this.refresh();
      } catch (e: any) {
        wx.showToast({ title: e.message || "支付失败", icon: "none" });
        this.setData({ payProcessing: false });
      }
    }, 600);
  },

  async onConfirmLoaded() {
    try {
      if (isSharedMode()) await sharedOrders.confirmLoaded(this.data.orderId, this.data.view?.order.version);
      else orderService.confirmLoaded(this.data.orderId);
      this.refresh();
    } catch (e: any) {
      wx.showToast({ title: e.message || "操作失败", icon: "none" });
    }
  },

  onConfirmReceived() {
    wx.showModal({
      title: "确认收货",
      content: "请确认已收到货物，本次操作不可撤销",
      success: async (r) => {
        if (r.confirm) {
          try {
            if (isSharedMode()) await sharedOrders.confirmReceived(this.data.orderId, this.data.view?.order.version);
            else orderService.confirmReceived(this.data.orderId);
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

  async onConfirmCancel() {
    try {
      if (isSharedMode()) await sharedOrders.cancel(this.data.orderId, this.data.cancelReason, this.data.view?.order.version);
      else orderService.cancel({ orderId: this.data.orderId, reason: this.data.cancelReason });
      this.setData({ cancelModalOpen: false });
      this.refresh();
    } catch (e: any) {
      wx.showToast({ title: e.message || "取消失败", icon: "none" });
    }
  },

  onCallSupport() {
    wx.navigateTo({ url: `/packages/account/pages/support/index?orderId=${this.data.orderId}` });
  },

  async onAcceptQuote() {
    try {
      await sharedOrders.acceptQuote(this.data.orderId, this.data.view?.order.version);
      this.refresh();
    } catch (e: any) { wx.showToast({ title: e?.message || "确认失败", icon: "none" }); }
  },

  onRetryPay() {
    this.onPay();
  },
}));
