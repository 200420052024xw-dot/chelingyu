"use strict";
/** Address Service */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addressService = void 0;
const index_1 = require("../repositories/index");
const clock_1 = require("../adapters/clock");
const identity_1 = require("../adapters/identity");
const session_1 = require("../stores/session");
exports.addressService = {
    list() {
        return index_1.repo.listAddresses(session_1.sessionStore.getCurrentUserId());
    },
    save(input) {
        var _a, _b;
        const userId = session_1.sessionStore.getCurrentUserId();
        const now = clock_1.clock.nowIso();
        let addr;
        if (input.id) {
            const existing = index_1.repo.listAddresses(userId).find((a) => a.id === input.id);
            if (!existing)
                throw new Error("地址不存在");
            addr = Object.assign(Object.assign(Object.assign({}, existing), input), { userId, updatedAt: now });
        }
        else {
            addr = {
                id: identity_1.identity.newId("addr"),
                userId,
                label: input.label,
                name: input.name,
                contactName: input.contactName,
                contactMobile: input.contactMobile,
                regionCode: input.regionCode,
                detail: input.detail,
                location: input.location,
                isDefaultSender: (_a = input.isDefaultSender) !== null && _a !== void 0 ? _a : false,
                isDefaultReceiver: (_b = input.isDefaultReceiver) !== null && _b !== void 0 ? _b : false,
                createdAt: now,
                updatedAt: now,
            };
        }
        // 默认地址唯一性
        const list = index_1.repo.listAddresses(userId);
        for (const a of list) {
            if (a.id === addr.id)
                continue;
            if (addr.isDefaultSender)
                a.isDefaultSender = false;
            if (addr.isDefaultReceiver)
                a.isDefaultReceiver = false;
        }
        index_1.repo.upsertAddress(addr);
        return addr;
    },
    remove(id) {
        index_1.repo.removeAddress(id);
    },
};
