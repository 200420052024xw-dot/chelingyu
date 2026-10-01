"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBookingDraft = updateBookingDraft;
const index_1 = require("../repositories/index");
const draft_1 = require("./draft");
const fleet_1 = require("./fleet");
const pricing_1 = require("./pricing");
const pricing_2 = require("../domain/pricing");
const order_draft_1 = require("../stores/order-draft");
function updateBookingDraft(draftId, patch) {
    var _a;
    const original = index_1.repo.getDraft(draftId);
    if (!original)
        throw new Error("草稿不存在");
    try {
        let updated = draft_1.draftService.update(draftId, patch);
        const modelId = updated.selectedVehicleModelId;
        if (!modelId)
            throw new Error("请先选择车型");
        const offer = fleet_1.fleetService.recommend({ draft: updated }).find((item) => item.modelId === modelId);
        const source = updated.serviceTimeMode === "scheduled" ? "headquarters" : (_a = offer === null || offer === void 0 ? void 0 : offer.supplySource) !== null && _a !== void 0 ? _a : "headquarters";
        if (updated.dispatchSource !== source) {
            updated = draft_1.draftService.update(draftId, (draft) => (Object.assign(Object.assign({}, draft), { dispatchSource: source })));
        }
        const quote = pricing_1.pricingService.quote({ draft: updated, modelId });
        const bound = draft_1.draftService.attachQuote(draftId, quote.id, (0, pricing_2.computeInputFingerprint)(updated, modelId));
        order_draft_1.draftStore.set(bound);
        return bound;
    }
    catch (error) {
        index_1.repo.upsertDraft(original);
        order_draft_1.draftStore.set(original);
        throw error;
    }
}
