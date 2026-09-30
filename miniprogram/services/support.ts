/** Support Service */

import type { ID, SupportTicket } from "../contracts/types";
import { repo } from "../repositories/index";
import { sessionStore } from "../stores/session";
import { clock } from "../adapters/clock";
import { identity } from "../adapters/identity";

export const supportService = {
  create(input: { description: string; category: SupportTicket["category"]; orderId?: ID; vehicleId?: ID }): SupportTicket {
    const now = clock.nowIso();
    const t: SupportTicket = {
      id: identity.newId("ticket"),
      ticketNo: `T${Date.now().toString().slice(-8)}`,
      creatorUserId: sessionStore.getCurrentUserId(),
      orderId: input.orderId,
      vehicleId: input.vehicleId,
      category: input.category,
      description: input.description,
      imageUrls: [],
      status: "open",
      createdAt: now,
      updatedAt: now,
    };
    repo.upsertSupportTicket(t);
    return t;
  },

  list(): SupportTicket[] {
    return repo.listSupportTickets(sessionStore.getCurrentUserId());
  },

  detail(id: ID): SupportTicket | undefined {
    return repo.listSupportTickets().find((t) => t.id === id);
  },
};
