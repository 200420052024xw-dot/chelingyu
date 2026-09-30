"use strict";
/** Notification Service */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const index_1 = require("../repositories/index");
const session_1 = require("../stores/session");
const clock_1 = require("../adapters/clock");
exports.notificationService = {
    list() {
        const userId = session_1.sessionStore.getCurrentUserId();
        const list = index_1.repo.listNotifications(userId);
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return list;
    },
    unreadCount() {
        return this.list().filter((n) => !n.readAt).length;
    },
    markRead(id) {
        const db = require("../repositories/local-database").getDB();
        const n = db.notifications.find((x) => x.id === id);
        if (n) {
            n.readAt = clock_1.clock.nowIso();
            n.updatedAt = clock_1.clock.nowIso();
            require("../repositories/local-database").commitDB();
        }
    },
    markAllRead() {
        const db = require("../repositories/local-database").getDB();
        const now = clock_1.clock.nowIso();
        for (const n of db.notifications) {
            if (n.userId === session_1.sessionStore.getCurrentUserId() && !n.readAt) {
                n.readAt = now;
                n.updatedAt = now;
            }
        }
        require("../repositories/local-database").commitDB();
    },
};
