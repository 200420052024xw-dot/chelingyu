"use strict";
/** Session Service */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionService = void 0;
const session_1 = require("../stores/session");
const index_1 = require("../repositories/index");
exports.sessionService = {
    getSession() {
        const userId = session_1.sessionStore.getCurrentUserId();
        const user = index_1.repo.getUser(userId);
        if (!user)
            throw new Error("当前用户不存在");
        const owner = index_1.repo.getVehicleOwnerByUser(userId);
        return {
            user,
            owner,
            identity: session_1.sessionStore.getIdentity(),
        };
    },
    switchDemoIdentity(identity) {
        session_1.sessionStore.switchIdentity(identity);
        return this.getSession();
    },
};
