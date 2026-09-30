/** Draft Service */

import type { ID, OrderDraft } from "../contracts/types";
import { repo } from "../repositories/index";
import { clock } from "../adapters/clock";
import { identity } from "../adapters/identity";
import { sessionStore } from "../stores/session";

export const draftService = {
  create(initial: Partial<Pick<OrderDraft, "sender" | "receiver" | "serviceTimeMode" | "scheduledPickupAt">> = {}): OrderDraft {
    const userId = sessionStore.getCurrentUserId();
    const now = clock.nowIso();
    const d: OrderDraft = {
      id: identity.newId("draft"),
      userId,
      revision: 1,
      ...initial,
      serviceTimeMode: initial.serviceTimeMode ?? "immediate",
      createdAt: now,
      updatedAt: now,
    };
    repo.upsertDraft(d);
    return d;
  },

  get(id: ID): OrderDraft | undefined {
    return repo.getDraft(id);
  },

  update(id: ID, patch: (d: OrderDraft) => OrderDraft): OrderDraft {
    const cur = repo.getDraft(id);
    if (!cur) throw new Error("草稿不存在");
    const next = patch({ ...cur });
    next.revision = cur.revision + 1;
    next.updatedAt = clock.nowIso();
    next.selectedQuoteId = undefined;
    next.inputFingerprint = undefined;
    repo.upsertDraft(next);
    return next;
  },

  /** 报价绑定不改变草稿输入版本，否则刚生成的报价会立即失效。 */
  attachQuote(id: ID, quoteId: ID, inputFingerprint: string): OrderDraft {
    const draft = repo.getDraft(id);
    if (!draft) throw new Error("草稿不存在");
    const next = { ...draft, selectedQuoteId: quoteId, inputFingerprint };
    repo.upsertDraft(next);
    return next;
  },

  /** 恢复当前用户的最近草稿（如有） */
  loadCurrent(): OrderDraft | undefined {
    const userId = sessionStore.getCurrentUserId();
    let latest: OrderDraft | undefined;
    for (const draft of repo.listDrafts()) {
      if (draft.userId !== userId) continue;
      if (!latest || draft.updatedAt > latest.updatedAt) latest = draft;
    }
    return latest;
  },

  remove(id: ID): void {
    repo.removeDraft(id);
  },
};
