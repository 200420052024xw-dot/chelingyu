/** 订单草稿临时状态（页面间共享） */

import type { OrderDraft, CargoInfo, DeliveryAddressSnapshot, ID, ServiceTimeMode } from "../contracts/types";
import { APP_CONFIG } from "../config/index";

let activeDraft: OrderDraft | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export const draftStore = {
  get(): OrderDraft | null {
    return activeDraft;
  },

  set(d: OrderDraft): void {
    activeDraft = d;
    notify();
  },

  clear(): void {
    activeDraft = null;
    notify();
  },

  /** 创建或恢复当前用户的草稿 */
  ensure(): OrderDraft {
    if (activeDraft) return activeDraft;
    const now = new Date().toISOString();
    activeDraft = {
      id: `draft_${Date.now().toString(36)}`,
      userId: APP_CONFIG.demoUserId,
      revision: 1,
      serviceTimeMode: "immediate",
      createdAt: now,
      updatedAt: now,
    };
    notify();
    return activeDraft;
  },

  /** 任意修改：版本号递增 */
  mutate(patch: (d: OrderDraft) => OrderDraft): OrderDraft {
    const d = this.ensure();
    const next = patch({ ...d });
    next.revision = d.revision + 1;
    next.updatedAt = new Date().toISOString();
    // 修改草稿时清除当前报价
    next.selectedQuoteId = undefined;
    next.inputFingerprint = undefined;
    activeDraft = next;
    notify();
    return next;
  },

  setSender(snap: DeliveryAddressSnapshot | undefined): OrderDraft {
    return this.mutate((d) => ({ ...d, sender: snap }));
  },

  setReceiver(snap: DeliveryAddressSnapshot | undefined): OrderDraft {
    return this.mutate((d) => ({ ...d, receiver: snap }));
  },

  setServiceTime(mode: ServiceTimeMode, scheduledAt?: string): OrderDraft {
    return this.mutate((d) => ({ ...d, serviceTimeMode: mode, scheduledPickupAt: scheduledAt }));
  },

  setCargo(cargo: CargoInfo | undefined): OrderDraft {
    return this.mutate((d) => ({ ...d, cargo }));
  },

  setSelectedModel(modelId: ID | undefined): OrderDraft {
    return this.mutate((d) => ({ ...d, selectedVehicleModelId: modelId }));
  },

  attachQuote(quoteId: ID, fingerprint: string): OrderDraft {
    return this.mutate((d) => ({ ...d, selectedQuoteId: quoteId, inputFingerprint: fingerprint }));
  },

  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
