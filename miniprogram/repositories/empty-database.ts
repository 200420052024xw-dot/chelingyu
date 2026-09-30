import type { LocalDatabase } from "../fixtures/seed";
import { APP_CONFIG } from "../config/index";

/** 未接入真实后端时只返回空数据，绝不预置用户、订单或交易。 */
export function createEmptyDatabase(): LocalDatabase {
  return {
    schemaVersion: APP_CONFIG.schemaVersion,
    users: [],
    addresses: [],
    regions: [],
    serviceAreas: [],
    vehicleOwners: [],
    vehicleModels: [],
    vehicles: [],
    availabilityRules: [],
    reservations: [],
    drafts: [],
    quotes: [],
    pricingPolicies: [],
    orders: [],
    orderEvents: [],
    payments: [],
    refunds: [],
    revenueSharingRules: [],
    revenueAllocations: [],
    notifications: [],
    supportTickets: [],
  };
}
