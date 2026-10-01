/** 更新选车草稿后，重新计算调车来源和报价。失败时恢复原草稿。 */
import type { OrderDraft } from "../contracts/types";
import { repo } from "../repositories/index";
import { draftService } from "./draft";
import { fleetService } from "./fleet";
import { pricingService } from "./pricing";
import { computeInputFingerprint } from "../domain/pricing";
import { draftStore } from "../stores/order-draft";

export function updateBookingDraft(
  draftId: string,
  patch: (draft: OrderDraft) => OrderDraft,
): OrderDraft {
  const original = repo.getDraft(draftId);
  if (!original) throw new Error("草稿不存在");
  try {
    let updated = draftService.update(draftId, patch);
    const modelId = updated.selectedVehicleModelId;
    if (!modelId) throw new Error("请先选择车型");
    const offer = fleetService.recommend({ draft: updated }).find((item) => item.modelId === modelId);
    const source = updated.serviceTimeMode === "scheduled" ? "headquarters" : offer?.supplySource ?? "headquarters";
    if (updated.dispatchSource !== source) {
      updated = draftService.update(draftId, (draft) => ({ ...draft, dispatchSource: source }));
    }
    const quote = pricingService.quote({ draft: updated, modelId });
    const bound = draftService.attachQuote(draftId, quote.id, computeInputFingerprint(updated, modelId));
    draftStore.set(bound);
    return bound;
  } catch (error) {
    repo.upsertDraft(original);
    draftStore.set(original);
    throw error;
  }
}
