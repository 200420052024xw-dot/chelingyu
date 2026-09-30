"use strict";
/** 本地业务会话。 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionStore = void 0;
const storage_1 = require("../adapters/storage");
const local_database_1 = require("../repositories/local-database");
const index_1 = require("../config/index");
let state = {
    currentUserId: index_1.APP_CONFIG.demoUserId,
    currentOwnerId: index_1.APP_CONFIG.demoOwnerId,
    identity: "customer",
};
const listeners = new Set();
function persist() {
    storage_1.storage.write(storage_1.storageKeys.session, state);
    listeners.forEach((fn) => fn());
}
exports.sessionStore = {
    setAuthenticatedUser(userId, ownerId = "") {
        if (!userId)
            throw new Error("用户 ID 不能为空");
        state = { currentUserId: userId, currentOwnerId: ownerId, identity: "customer" };
        persist();
    },
    bootstrap() {
        const cached = storage_1.storage.read(storage_1.storageKeys.session, null);
        if (cached && cached.currentUserId && (0, local_database_1.getDB)().users.some((user) => user.id === cached.currentUserId)) {
            state = cached;
        }
        else {
            state = {
                currentUserId: index_1.APP_CONFIG.demoUserId,
                currentOwnerId: index_1.APP_CONFIG.demoOwnerId,
                identity: "customer",
            };
            persist();
        }
        (0, local_database_1.subscribeDB)(() => {
            // 数据库变更（特别是重置）后，重新对齐当前用户
            const db = (0, local_database_1.getDB)();
            if (state.currentUserId && !db.users.find((u) => u.id === state.currentUserId)) {
                state = {
                    currentUserId: index_1.APP_CONFIG.demoUserId,
                    currentOwnerId: index_1.APP_CONFIG.demoOwnerId,
                    identity: "customer",
                };
                persist();
            }
        });
    },
    snapshot() {
        return Object.assign({}, state);
    },
    switchIdentity(identity) {
        state = Object.assign(Object.assign({}, state), { identity });
        persist();
    },
    getCurrentUserId() {
        return state.currentUserId;
    },
    getCurrentOwnerId() {
        return state.currentOwnerId;
    },
    getIdentity() {
        return state.identity;
    },
    subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
};
