/** 本地业务会话。 */

import { storage, storageKeys } from "../adapters/storage";
import { subscribeDB, getDB } from "../repositories/local-database";
import { APP_CONFIG } from "../config/index";

interface SessionState {
  currentUserId: string;
  currentOwnerId: string;
  identity: "customer" | "vehicle_owner";
}

let state: SessionState = {
  currentUserId: APP_CONFIG.demoUserId,
  currentOwnerId: APP_CONFIG.demoOwnerId,
  identity: "customer",
};

const listeners = new Set<() => void>();

function persist() {
  storage.write(storageKeys.session, state);
  listeners.forEach((fn) => fn());
}

export const sessionStore = {
  setAuthenticatedUser(userId: string, ownerId = ""): void {
    if (!userId) throw new Error("用户 ID 不能为空");
    state = { currentUserId: userId, currentOwnerId: ownerId, identity: "customer" };
    persist();
  },

  bootstrap(): void {
    const cached = storage.read<SessionState | null>(storageKeys.session, null as unknown as SessionState);
    if (cached && cached.currentUserId && getDB().users.some((user) => user.id === cached.currentUserId)) {
      state = cached;
    } else {
      state = {
        currentUserId: APP_CONFIG.demoUserId,
        currentOwnerId: APP_CONFIG.demoOwnerId,
        identity: "customer",
      };
      persist();
    }
    subscribeDB(() => {
      // 数据库变更（特别是重置）后，重新对齐当前用户
      const db = getDB();
      if (state.currentUserId && !db.users.find((u) => u.id === state.currentUserId)) {
        state = {
          currentUserId: APP_CONFIG.demoUserId,
          currentOwnerId: APP_CONFIG.demoOwnerId,
          identity: "customer",
        };
        persist();
      }
    });
  },

  snapshot(): SessionState {
    return { ...state };
  },

  switchIdentity(identity: "customer" | "vehicle_owner"): void {
    state = { ...state, identity };
    persist();
  },

  getCurrentUserId(): string {
    return state.currentUserId;
  },

  getCurrentOwnerId(): string {
    return state.currentOwnerId;
  },

  getIdentity(): "customer" | "vehicle_owner" {
    return state.identity;
  },

  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
