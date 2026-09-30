"use strict";
/** Pricing Service */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingService = exports.PricingError = void 0;
const index_1 = require("../repositories/index");
const pricing_1 = require("../domain/pricing");
const validators_1 = require("../domain/validators");
const clock_1 = require("../adapters/clock");
class PricingError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.PricingError = PricingError;
exports.pricingService = {
    /** 生成报价（不可变快照） */
    quote(input) {
        const draft = index_1.repo.getDraft(input.draft.id);
        if (!draft)
            throw new PricingError("NOT_FOUND", "草稿不存在");
        const issues = (0, validators_1.validateDraftForQuote)(draft);
        if (issues.length) {
            throw new PricingError("VALIDATION_ERROR", issues.map((i) => i.message).join("；"));
        }
        const policy = index_1.repo.getDefaultPricingPolicy();
        if (!policy)
            throw new PricingError("NOT_FOUND", "缺少价格策略");
        const model = index_1.repo.getVehicleModel(input.modelId);
        if (!model)
            throw new PricingError("NOT_FOUND", "车型不存在");
        const vehicles = index_1.repo.listVehicles();
        const q = (0, pricing_1.computeQuote)({ draft, policy, vehicleModel: model, vehicles });
        index_1.repo.upsertQuote(q);
        return q;
    },
    /** 校验报价是否仍可用于订单创建 */
    validateQuoteForCreate(input) {
        const q = index_1.repo.getQuote(input.quoteId);
        if (!q)
            throw new PricingError("QUOTE_EXPIRED", "报价已失效");
        if (!(0, pricing_1.quoteIsValidFor)(q, input.draft, input.modelId)) {
            throw new PricingError("QUOTE_EXPIRED", "地址或货物信息已变更，请重新选择车型");
        }
        return q;
    },
    isExpired(q) {
        return new Date(q.expiresAt).getTime() < clock_1.clock.now().getTime();
    },
};
