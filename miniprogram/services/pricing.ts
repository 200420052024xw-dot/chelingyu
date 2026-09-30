/** Pricing Service */

import type { ID, OrderDraft, Quote } from "../contracts/types";
import { repo } from "../repositories/index";
import { computeQuote, quoteIsValidFor } from "../domain/pricing";
import { validateDraftForQuote } from "../domain/validators";
import { clock } from "../adapters/clock";
import { identity } from "../adapters/identity";

export class PricingError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export const pricingService = {
  /** 生成报价（不可变快照） */
  quote(input: { draft: OrderDraft; modelId: ID }): Quote {
    const draft = repo.getDraft(input.draft.id);
    if (!draft) throw new PricingError("NOT_FOUND", "草稿不存在");
    const issues = validateDraftForQuote(draft);
    if (issues.length) {
      throw new PricingError("VALIDATION_ERROR", issues.map((i) => i.message).join("；"));
    }
    const policy = repo.getDefaultPricingPolicy();
    if (!policy) throw new PricingError("NOT_FOUND", "缺少价格策略");
    const model = repo.getVehicleModel(input.modelId);
    if (!model) throw new PricingError("NOT_FOUND", "车型不存在");
    const vehicles = repo.listVehicles();
    const q = computeQuote({ draft, policy, vehicleModel: model, vehicles });
    repo.upsertQuote(q);
    return q;
  },

  /** 校验报价是否仍可用于订单创建 */
  validateQuoteForCreate(input: { quoteId: ID; draft: OrderDraft; modelId: ID }): Quote {
    const q = repo.getQuote(input.quoteId);
    if (!q) throw new PricingError("QUOTE_EXPIRED", "报价已失效");
    if (!quoteIsValidFor(q, input.draft, input.modelId)) {
      throw new PricingError("QUOTE_EXPIRED", "地址或货物信息已变更，请重新选择车型");
    }
    return q;
  },

  isExpired(q: Quote): boolean {
    return new Date(q.expiresAt).getTime() < clock.now().getTime();
  },
};
