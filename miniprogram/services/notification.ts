/** Notification Service */

import type { ID, Notification } from "../contracts/types";
import { repo } from "../repositories/index";
import { sessionStore } from "../stores/session";
import { clock } from "../adapters/clock";

export const notificationService = {
  list(): Notification[] {
    const userId = sessionStore.getCurrentUserId();
    const list = repo.listNotifications(userId);
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  },

  unreadCount(): number {
    return this.list().filter((n) => !n.readAt).length;
  },

  markRead(id: ID): void {
    const db = (require("../repositories/local-database") as typeof import("../repositories/local-database")).getDB();
    const n = db.notifications.find((x) => x.id === id);
    if (n) {
      n.readAt = clock.nowIso();
      n.updatedAt = clock.nowIso();
      (require("../repositories/local-database") as typeof import("../repositories/local-database")).commitDB();
    }
  },

  markAllRead(): void {
    const db = (require("../repositories/local-database") as typeof import("../repositories/local-database")).getDB();
    const now = clock.nowIso();
    for (const n of db.notifications) {
      if (n.userId === sessionStore.getCurrentUserId() && !n.readAt) {
        n.readAt = now;
        n.updatedAt = now;
      }
    }
    (require("../repositories/local-database") as typeof import("../repositories/local-database")).commitDB();
  },
};
