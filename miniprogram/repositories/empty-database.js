"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmptyDatabase = createEmptyDatabase;
const index_1 = require("../config/index");
/** 未接入真实后端时只返回空数据，绝不预置用户、订单或交易。 */
function createEmptyDatabase() {
    return {
        schemaVersion: index_1.APP_CONFIG.schemaVersion,
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
