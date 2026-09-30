"use strict";
/** Support Service */
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportService = void 0;
const index_1 = require("../repositories/index");
const session_1 = require("../stores/session");
const clock_1 = require("../adapters/clock");
const identity_1 = require("../adapters/identity");
exports.supportService = {
    create(input) {
        const now = clock_1.clock.nowIso();
        const t = {
            id: identity_1.identity.newId("ticket"),
            ticketNo: `T${Date.now().toString().slice(-8)}`,
            creatorUserId: session_1.sessionStore.getCurrentUserId(),
            orderId: input.orderId,
            vehicleId: input.vehicleId,
            category: input.category,
            description: input.description,
            imageUrls: [],
            status: "open",
            createdAt: now,
            updatedAt: now,
        };
        index_1.repo.upsertSupportTicket(t);
        return t;
    },
    list() {
        return index_1.repo.listSupportTickets(session_1.sessionStore.getCurrentUserId());
    },
    detail(id) {
        return index_1.repo.listSupportTickets().find((t) => t.id === id);
    },
};
