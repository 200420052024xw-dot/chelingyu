"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_performance_1 = require("../../../../utils/page-performance");
const notification_1 = require("../../../../services/notification");
const local_database_1 = require("../../../../repositories/local-database");
const clock_1 = require("../../../../adapters/clock");
const instance = {};
Page((0, page_performance_1.withPagePerformance)("packages/account/pages/messages/index", {
    data: {
        messages: [],
        filteredMessages: [],
        activeFilter: "all",
        unreadCount: 0,
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
        const list = notification_1.notificationService.list();
        const filtered = this.applyFilter(list, this.data.activeFilter);
        this.setData({
            messages: list,
            filteredMessages: filtered,
            unreadCount: notification_1.notificationService.unreadCount(),
        });
    },
    applyFilter(list, filter) {
        if (filter === "all")
            return list;
        if (filter === "unread")
            return list.filter((n) => !n.readAt);
        if (filter === "order")
            return list.filter((n) => n.type === "order" || n.relatedEntityType === "order");
        if (filter === "system")
            return list.filter((n) => n.type === "system" || n.relatedEntityType === "system");
        return list;
    },
    onFilter(e) {
        this.setData({ activeFilter: e.currentTarget.dataset.key });
        this.refresh();
    },
    onMarkRead(e) {
        const id = e.currentTarget.dataset.id;
        notification_1.notificationService.markRead(id);
        this.refresh();
    },
    onMarkAll() {
        notification_1.notificationService.markAllRead();
        this.refresh();
    },
    formatRelative(iso) {
        return (0, clock_1.formatRelativeMinutes)(iso);
    },
    onJump(e) {
        const id = e.currentTarget.dataset.id;
        const n = this.data.messages.find((x) => x.id === id);
        if (!n)
            return;
        notification_1.notificationService.markRead(id);
        if (n.relatedEntityType === "order" && n.relatedEntityId) {
            wx.navigateTo({ url: `/packages/delivery/pages/detail/index?id=${n.relatedEntityId}` });
        }
    },
}));
