/** Address Service */

import type { Address, ID } from "../contracts/types";
import { repo } from "../repositories/index";
import { clock } from "../adapters/clock";
import { identity } from "../adapters/identity";
import { sessionStore } from "../stores/session";

export const addressService = {
  list(): Address[] {
    return repo.listAddresses(sessionStore.getCurrentUserId());
  },

  save(input: Partial<Address> & { name: string; detail: string; contactName: string; contactMobile: string; location: Address["location"]; regionCode: string; label?: Address["label"]; isDefaultSender?: boolean; isDefaultReceiver?: boolean }): Address {
    const userId = sessionStore.getCurrentUserId();
    const now = clock.nowIso();
    let addr: Address;
    if (input.id) {
      const existing = repo.listAddresses(userId).find((a) => a.id === input.id);
      if (!existing) throw new Error("地址不存在");
      addr = {
        ...existing,
        ...input,
        userId,
        updatedAt: now,
      } as Address;
    } else {
      addr = {
        id: identity.newId("addr"),
        userId,
        label: input.label,
        name: input.name,
        contactName: input.contactName,
        contactMobile: input.contactMobile,
        regionCode: input.regionCode,
        detail: input.detail,
        location: input.location,
        isDefaultSender: input.isDefaultSender ?? false,
        isDefaultReceiver: input.isDefaultReceiver ?? false,
        createdAt: now,
        updatedAt: now,
      };
    }

    // 默认地址唯一性
    const list = repo.listAddresses(userId);
    for (const a of list) {
      if (a.id === addr.id) continue;
      if (addr.isDefaultSender) a.isDefaultSender = false;
      if (addr.isDefaultReceiver) a.isDefaultReceiver = false;
    }

    repo.upsertAddress(addr);
    return addr;
  },

  remove(id: ID): void {
    repo.removeAddress(id);
  },
};
