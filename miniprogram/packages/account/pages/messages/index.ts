import { withPagePerformance } from "../../../../utils/page-performance";
import type { Notification } from "../../../../contracts/types";
import { notificationService } from "../../../../services/notification";
import { subscribeDB } from "../../../../repositories/local-database";
import { formatRelativeMinutes } from "../../../../adapters/clock";

type Filter = "all" | "unread" | "order" | "system";

interface PageData {
  messages: Notification[];
  filteredMessages: Notification[];
  activeFilter: Filter;
  unreadCount: number;
}

interface PageInstance {
  unsubscribe?: () => void;
}

const instance: PageInstance = {};

Page<PageData, any>(withPagePerformance<PageData, any>("packages/account/pages/messages/index", {
  data: {
    messages: [],
    filteredMessages: [],
    activeFilter: "all",
    unreadCount: 0,
  },

  onLoad() {
    this.refresh();
    instance.unsubscribe = subscribeDB(() => this.refresh());
  },

  onUnload() {
    instance.unsubscribe?.();
  },

  refresh() {
    const list = notificationService.list();
    const filtered = this.applyFilter(list, this.data.activeFilter);
    this.setData({
      messages: list,
      filteredMessages: filtered,
      unreadCount: notificationService.unreadCount(),
    });
  },

  applyFilter(list: Notification[], filter: Filter): Notification[] {
    if (filter === "all") return list;
    if (filter === "unread") return list.filter((n) => !n.readAt);
    if (filter === "order") return list.filter((n) => n.type === "order" || n.relatedEntityType === "order");
    if (filter === "system") return list.filter((n) => n.type === "system" || n.relatedEntityType === "system");
    return list;
  },

  onFilter(e: any) {
    this.setData({ activeFilter: e.currentTarget.dataset.key as Filter });
    this.refresh();
  },

  onMarkRead(e: any) {
    const id = e.currentTarget.dataset.id;
    notificationService.markRead(id);
    this.refresh();
  },

  onMarkAll() {
    notificationService.markAllRead();
    this.refresh();
  },

  formatRelative(iso: string) {
    return formatRelativeMinutes(iso);
  },

  onJump(e: any) {
    const id = e.currentTarget.dataset.id;
    const n = this.data.messages.find((x) => x.id === id);
    if (!n) return;
    notificationService.markRead(id);
    if (n.relatedEntityType === "order" && n.relatedEntityId) {
      wx.navigateTo({ url: `/packages/delivery/pages/detail/index?id=${n.relatedEntityId}` });
    }
  },
}));