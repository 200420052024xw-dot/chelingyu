import { withPagePerformance } from "../../../../utils/page-performance";
import type { SupportTicket, SupportTicketStatus } from "../../../../contracts/types";
import { supportService } from "../../../../services/support";
import { repo } from "../../../../repositories/index";
import { formatRelativeMinutes } from "../../../../adapters/clock";

type SupportCategory = SupportTicket["category"];

interface PageData {
  categories: { key: SupportCategory; label: string; icon: string }[];
  tickets: SupportTicket[];
  draftCategory: SupportCategory;
  draftDescription: string;
  linkedOrderId: string;
  linkedOrderNo: string;
}

const CATEGORY_DEFS: { key: SupportCategory; label: string; icon: string }[] = [
  { key: "order", label: "订单问题", icon: "/assets/icons/box.png" },
  { key: "vehicle", label: "车辆问题", icon: "/assets/icons/vehicle.png" },
  { key: "payment", label: "支付/退款", icon: "/assets/icons/money.png" },
  { key: "complaint", label: "投诉建议", icon: "/assets/icons/support.png" },
  { key: "other", label: "其他", icon: "/assets/icons/chat.png" },
];

const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: "待处理",
  processing: "处理中",
  resolved: "已解决",
  closed: "已关闭",
};

Page<PageData, any>(withPagePerformance<PageData, any>("packages/account/pages/support/index", {
  data: {
    categories: CATEGORY_DEFS,
    tickets: [],
    draftCategory: "order",
    draftDescription: "",
    linkedOrderId: "",
    linkedOrderNo: "",
  },

  onLoad(query: Record<string, string | undefined>) {
    const orderId = (query?.orderId as string) || "";
    let orderNo = "";
    if (orderId) {
      try {
        const order = repo.getOrder(orderId);
        orderNo = order?.orderNo || "";
      } catch {
        // 忽略，单纯 link 不存在
      }
    }
    this.setData({
      linkedOrderId: orderId,
      linkedOrderNo: orderNo,
      draftCategory: orderId ? "order" : "order",
      draftDescription: orderId && orderNo ? `订单问题：订单号 ${orderNo}，请补充问题详情。` : "",
    });
    this.refresh();
  },

  refresh() {
    this.setData({ tickets: supportService.list() });
  },

  onPickDraftCategory(e: any) {
    this.setData({ draftCategory: e.currentTarget.dataset.key });
  },

  onDraftDescription(e: any) {
    this.setData({ draftDescription: e.detail.value });
  },

  onSubmit() {
    const { draftCategory, draftDescription, linkedOrderId } = this.data;
    if (!draftDescription.trim()) {
      wx.showToast({ title: "请输入问题描述", icon: "none" });
      return;
    }
    supportService.create({
      category: draftCategory,
      description: draftDescription.trim(),
      orderId: linkedOrderId || undefined,
    });
    this.setData({ draftDescription: "" });
    this.refresh();
    wx.showToast({ title: "已提交", icon: "success" });
  },

  formatCategory(key: SupportCategory) {
    return CATEGORY_DEFS.find((c) => c.key === key)?.label || key;
  },

  formatStatus(s: SupportTicketStatus) {
    return STATUS_LABELS[s] || s;
  },

  formatRelative(iso: string) {
    return formatRelativeMinutes(iso);
  },
}));
