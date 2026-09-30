"use strict";
/** Draft Service */
Object.defineProperty(exports, "__esModule", { value: true });
exports.draftService = void 0;
const index_1 = require("../repositories/index");
const clock_1 = require("../adapters/clock");
const identity_1 = require("../adapters/identity");
const session_1 = require("../stores/session");
exports.draftService = {
    create(initial = {}) {
        var _a;
        const userId = session_1.sessionStore.getCurrentUserId();
        const now = clock_1.clock.nowIso();
        const d = Object.assign(Object.assign({ id: identity_1.identity.newId("draft"), userId, revision: 1 }, initial), { serviceTimeMode: (_a = initial.serviceTimeMode) !== null && _a !== void 0 ? _a : "immediate", createdAt: now, updatedAt: now });
        index_1.repo.upsertDraft(d);
        return d;
    },
    get(id) {
        return index_1.repo.getDraft(id);
    },
    update(id, patch) {
        const cur = index_1.repo.getDraft(id);
        if (!cur)
            throw new Error("草稿不存在");
        const next = patch(Object.assign({}, cur));
        next.revision = cur.revision + 1;
        next.updatedAt = clock_1.clock.nowIso();
        next.selectedQuoteId = undefined;
        next.inputFingerprint = undefined;
        index_1.repo.upsertDraft(next);
        return next;
    },
    /** 报价绑定不改变草稿输入版本，否则刚生成的报价会立即失效。 */
    attachQuote(id, quoteId, inputFingerprint) {
        const draft = index_1.repo.getDraft(id);
        if (!draft)
            throw new Error("草稿不存在");
        const next = Object.assign(Object.assign({}, draft), { selectedQuoteId: quoteId, inputFingerprint });
        index_1.repo.upsertDraft(next);
        return next;
    },
    /** 恢复当前用户的最近草稿（如有） */
    loadCurrent() {
        const userId = session_1.sessionStore.getCurrentUserId();
        let latest;
        for (const draft of index_1.repo.listDrafts()) {
            if (draft.userId !== userId)
                continue;
            if (!latest || draft.updatedAt > latest.updatedAt)
                latest = draft;
        }
        return latest;
    },
    remove(id) {
        index_1.repo.removeDraft(id);
    },
};
