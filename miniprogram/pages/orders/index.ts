import type { DeliveryOrder, OrderStatus } from "../../contracts/types";
import { orderService } from "../../services/order";
import { subscribeDB } from "../../repositories/local-database";
import { formatMoneyFen, statusBadge } from "../../view-models/order";
import { formatDateTime } from "../../adapters/clock";
import { withPagePerformance } from "../../utils/page-performance";

interface PageData {
  loading: boolean;
  filter: "all" | "active" | "pending_payment" | "completed" | "cancelled";
  list: Array<{
    id: string;
    orderNo: string;
    status: OrderStatus;
    statusBadge: { text: string; tone: string };
    totalAmountFen: number;
    createdAt: string;
    sender: string;
    receiver: string;
    vehicleModelName: string;
    dispatchSourceLabel: string;
  }>;
  tabs: Array<{ key: string; label: string }>;
}

interface PageInstance {
  unsubscribe?: () => void;
}

const instance: PageInstance = {};

Page<PageData, any>(withPagePerformance<PageData, any>("orders", {
  data: {
    loading: true,
    filter: "all",
    list: [],
    tabs: [
      { key: "all", label: "全部" },
      { key: "active", label: "进行中" },
      { key: "pending_payment", label: "待支付" },
      { key: "completed", label: "已完成" },
      { key: "cancelled", label: "已取消" },
    ],
  },

  onLoad() {
    this.refresh();
    instance.unsubscribe = subscribeDB(() => this.refresh());
  },

  onUnload() {
    instance.unsubscribe?.();
  },

  refresh() {
    const orders = orderService.list({ status: this.data.filter as any });
    const list = orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      status: o.status,
      statusBadge: statusBadge(o.status),
      totalAmountFen: o.totalAmountFen,
      createdAt: formatDateTime(o.createdAt),
      sender: o.sender.name,
      receiver: o.receiver.name,
      vehicleModelName: o.vehicleSnapshot.modelName,
      dispatchSourceLabel: o.dispatchSource === "headquarters" ? "总部调车" : "附近演示运力",
    }));
    this.setData({ list, loading: false });
  },

  onTabChange(e: any) {
    this.setData({ filter: e.currentTarget.dataset.key });
    this.refresh();
  },

  onOpenDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/packages/delivery/pages/detail/index?id=${id}` });
  },

  formatMoney(f: number) {
    return formatMoneyFen(f);
  },
}));
