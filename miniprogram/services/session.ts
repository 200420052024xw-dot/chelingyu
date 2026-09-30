/** Session Service */

import type { User, VehicleOwner } from "../contracts/types";
import { sessionStore } from "../stores/session";
import { repo } from "../repositories/index";

export interface SessionView {
  user: User;
  owner?: VehicleOwner;
  identity: "customer" | "vehicle_owner";
}

export const sessionService = {
  getSession(): SessionView {
    const userId = sessionStore.getCurrentUserId();
    const user = repo.getUser(userId);
    if (!user) throw new Error("当前用户不存在");
    const owner = repo.getVehicleOwnerByUser(userId);
    return {
      user,
      owner,
      identity: sessionStore.getIdentity(),
    };
  },

  switchDemoIdentity(identity: "customer" | "vehicle_owner"): SessionView {
    sessionStore.switchIdentity(identity);
    return this.getSession();
  },
};
