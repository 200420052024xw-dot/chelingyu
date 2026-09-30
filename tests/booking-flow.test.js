"use strict";

const assert = require("node:assert/strict");

const values = new Map();
global.wx = {
  getStorageSync(key) { return values.has(key) ? values.get(key) : ""; },
  setStorageSync(key, value) { values.set(key, value); },
  removeStorageSync(key) { values.delete(key); },
  clearStorageSync() { values.clear(); },
  getFileSystemManager() { return { readFileSync() { throw new Error("no fixture override"); } }; },
};

const { replaceDBForTests } = require("../miniprogram/repositories/local-database.js");
const { createSeedDatabase } = require("../miniprogram/fixtures/seed.js");
const { repo } = require("../miniprogram/repositories/index.js");
const { draftService } = require("../miniprogram/services/draft.js");
const { pricingService } = require("../miniprogram/services/pricing.js");
const { orderService } = require("../miniprogram/services/order.js");
const { paymentService } = require("../miniprogram/services/payment.js");
const { fleetService } = require("../miniprogram/services/fleet.js");
const { computeInputFingerprint } = require("../miniprogram/domain/pricing.js");
const { pickDispatchedVehicle } = require("../miniprogram/domain/scheduling.js");
const { sessionStore } = require("../miniprogram/stores/session.js");

replaceDBForTests(createSeedDatabase());
sessionStore.setAuthenticatedUser("usr_customer_001", "owner_001");
const addresses = repo.listAddresses("usr_customer_001");
const draft = draftService.create();
const completedDraft = draftService.update(draft.id, (current) => ({
  ...current,
  sender: { ...addresses[0], sourceAddressId: addresses[0].id },
  receiver: { ...addresses[1], sourceAddressId: addresses[1].id },
  cargo: {
    category: "document",
    description: "演示文件",
    quantity: 1,
    unitWeightGrams: 500,
    fragile: false,
    needsHandling: false,
  },
  selectedVehicleModelId: "z2",
}));

const quote = pricingService.quote({ draft: completedDraft, modelId: "z2" });
assert.equal(repo.getVehicle(quote.vehicleId).modelId, "z2");
const bound = draftService.attachQuote(draft.id, quote.id, computeInputFingerprint(completedDraft, "z2"));
assert.equal(bound.revision, quote.draftRevision);
assert.equal(pricingService.validateQuoteForCreate({ quoteId: quote.id, draft: bound, modelId: "z2" }).id, quote.id);

const order = orderService.create({ draftId: draft.id, quoteId: quote.id, requestId: "test-booking" });
assert.equal(order.status, "pending_payment");
assert.equal(repo.getDraft(draft.id), undefined);

paymentService.payMock({ orderId: order.id, requestId: "test-fail", scenario: "fail" });
assert.equal(orderService.detail(order.id).payment.status, "failed");
paymentService.payMock({ orderId: order.id, requestId: "test-success", scenario: "success" });
assert.equal(orderService.detail(order.id).payment.status, "succeeded");
assert.equal(orderService.detail(order.id).order.status, "paid");

const cancelled = orderService.cancel({ orderId: order.id, reason: "测试取消" });
assert.equal(cancelled.status, "cancelled");
assert.equal(repo.getOrder(order.id).cancellationReason, "测试取消");
assert.throws(() => paymentService.payMock({ orderId: order.id, requestId: "test-after-cancel", scenario: "fail" }), /不能支付/);

const models = new Map(repo.listVehicleModels().map((m) => [m.id, m]));
const rules = new Map(repo.listAvailabilityRules().map((r) => [r.vehicleId, {
  ...r,
  enabled: true,
  ranges: [{ weekdays: [1, 2, 3, 4, 5, 6, 7], startTime: "00:00", endTime: "23:59" }],
}]));
const now = new Date();
now.setHours(12, 0, 0, 0);
const candidate = pickDispatchedVehicle(repo.listVehicles(), models, completedDraft, rules, now);
assert.ok(candidate);
assert.equal(candidate.vehicle.modelId, "z2");

// A compatible model can use confirmed headquarters capacity without inventing a nearby vehicle.
replaceDBForTests(createSeedDatabase());
sessionStore.setAuthenticatedUser("usr_customer_001", "owner_001");
repo.listVehicles().forEach((vehicle) => repo.upsertVehicle({ ...vehicle, ownerShared: false }));
const hqAddresses = repo.listAddresses("usr_customer_001");
const hqDraft = draftService.create();
const hqCompletedDraft = draftService.update(hqDraft.id, (current) => ({
  ...current,
  sender: { ...hqAddresses[0], sourceAddressId: hqAddresses[0].id },
  receiver: { ...hqAddresses[1], sourceAddressId: hqAddresses[1].id },
  cargo: { category: "document", description: "总部调车测试", quantity: 1, unitWeightGrams: 500, fragile: false, needsHandling: false },
  selectedVehicleModelId: "z2",
  dispatchSource: "headquarters",
}));
const hqOffers = fleetService.recommend({ draft: hqCompletedDraft });
assert.ok(hqOffers.some((offer) => offer.available && offer.supplySource === "headquarters"));
const hqQuote = pricingService.quote({ draft: hqCompletedDraft, modelId: "z2" });
const hqBound = draftService.attachQuote(hqDraft.id, hqQuote.id, computeInputFingerprint(hqCompletedDraft, "z2"));
assert.throws(() => orderService.create({ draftId: hqDraft.id, quoteId: hqQuote.id, requestId: "hq-unconfirmed" }), /尚未确认/);
repo.upsertDraft({ ...hqBound, headquartersConfirmed: true });
const hqOrder = orderService.create({ draftId: hqDraft.id, quoteId: hqQuote.id, requestId: "hq-confirmed" });
paymentService.payMock({ orderId: hqOrder.id, requestId: "hq-payment", scenario: "success" });
const dispatchedHqOrder = orderService.advance({ orderId: hqOrder.id });
assert.equal(dispatchedHqOrder.status, "dispatched");
assert.equal(dispatchedHqOrder.dispatchSource, "headquarters");
assert.equal(dispatchedHqOrder.assignedVehicleId, undefined);

console.log("[booking-flow] 草稿、报价、附近车辆匹配与先确认总部运力后支付通过");
