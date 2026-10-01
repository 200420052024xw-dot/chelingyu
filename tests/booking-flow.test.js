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
const { updateBookingDraft } = require("../miniprogram/services/booking-draft.js");
const { advanceDemoClock, resetDemoClock } = require("../miniprogram/adapters/clock.js");

function makeAlwaysAvailable() {
  repo.listAvailabilityRules().forEach((rule) => repo.upsertAvailabilityRule({
    ...rule,
    enabled: true,
    ranges: [{ weekdays: [1, 2, 3, 4, 5, 6, 7], startTime: "00:00", endTime: "23:59" }],
  }));
}

replaceDBForTests(createSeedDatabase());
makeAlwaysAvailable();
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
assert.equal(orderService.detail(order.id).order.status, "dispatched");
assert.equal(orderService.detail(order.id).order.assignedVehicleId, quote.vehicleId);

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

// Editing on the confirmation page must refresh the quote and keep the draft usable.
replaceDBForTests(createSeedDatabase());
makeAlwaysAvailable();
sessionStore.setAuthenticatedUser("usr_customer_001", "owner_001");
const editAddresses = repo.listAddresses("usr_customer_001");
const editDraft = draftService.create();
const editFilled = draftService.update(editDraft.id, (current) => ({
  ...current,
  sender: { ...editAddresses[0], sourceAddressId: editAddresses[0].id },
  receiver: { ...editAddresses[1], sourceAddressId: editAddresses[1].id },
  cargo: { category: "document", description: "修改前", quantity: 1, fragile: false, needsHandling: false },
  selectedVehicleModelId: "z2",
  dispatchSource: "nearby",
}));
const editQuote = pricingService.quote({ draft: editFilled, modelId: "z2" });
draftService.attachQuote(editDraft.id, editQuote.id, computeInputFingerprint(editFilled, "z2"));
const reQuoted = updateBookingDraft(editDraft.id, (current) => ({
  ...current,
  cargo: { ...current.cargo, description: "修改后" },
}));
assert.notEqual(reQuoted.selectedQuoteId, editQuote.id);
assert.equal(reQuoted.cargo.description, "修改后");
assert.equal(pricingService.validateQuoteForCreate({ quoteId: reQuoted.selectedQuoteId, draft: reQuoted, modelId: "z2" }).id, reQuoted.selectedQuoteId);
assert.throws(() => updateBookingDraft(editDraft.id, (current) => ({
  ...current,
  cargo: { ...current.cargo, description: "" },
})), /请填写货物说明/);
assert.equal(repo.getDraft(editDraft.id).selectedQuoteId, reQuoted.selectedQuoteId);

// Headquarters requests are real pending-review orders, never customer-approved.
replaceDBForTests(createSeedDatabase());
makeAlwaysAvailable();
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
repo.upsertDraft({ ...hqBound, headquartersConfirmed: true });
const hqOrder = orderService.create({ draftId: hqDraft.id, quoteId: hqQuote.id, requestId: "hq-review" });
assert.equal(hqOrder.status, "pending_headquarters_review");
assert.equal(hqOrder.headquartersConfirmed, false);
assert.throws(() => paymentService.payMock({ orderId: hqOrder.id, requestId: "hq-too-early", scenario: "success" }), /不能支付/);
assert.equal(orderService.advance({ orderId: hqOrder.id }).status, "pending_headquarters_review");
const approved = orderService.reviewHeadquarters({ orderId: hqOrder.id, reviewerId: "future_admin", decision: "approved" });
assert.equal(approved.status, "pending_payment");
paymentService.payMock({ orderId: hqOrder.id, requestId: "hq-payment", scenario: "success" });
const waitingHqOrder = orderService.detail(hqOrder.id).order;
assert.equal(waitingHqOrder.status, "matching");
assert.equal(waitingHqOrder.assignedVehicleId, undefined);

// Scheduled requests always wait for headquarters and dispatch near pickup time.
replaceDBForTests(createSeedDatabase());
makeAlwaysAvailable();
sessionStore.setAuthenticatedUser("usr_customer_001", "owner_001");
const scheduledAddresses = repo.listAddresses("usr_customer_001");
const z2Vehicle = repo.listVehicles().find((vehicle) => vehicle.modelId === "z2");
const z2Rule = repo.listAvailabilityRules().find((rule) => rule.vehicleId === z2Vehicle.id);
repo.upsertVehicle({ ...z2Vehicle, id: "veh_nearest_test", vehicleNo: "CLY-NEAREST", status: "available", ownerShared: true, location: scheduledAddresses[0].location, currentOrderId: undefined });
repo.upsertAvailabilityRule({ ...z2Rule, id: "availability_nearest_test", vehicleId: "veh_nearest_test" });
const scheduledDraft = draftService.create();
const pickupAt = new Date(Date.now() + 120 * 60 * 1000).toISOString();
const completedScheduled = draftService.update(scheduledDraft.id, (current) => ({
  ...current,
  sender: { ...scheduledAddresses[0], sourceAddressId: scheduledAddresses[0].id },
  receiver: { ...scheduledAddresses[1], sourceAddressId: scheduledAddresses[1].id },
  cargo: { category: "document", description: "预约文件", quantity: 1, unitWeightGrams: 500, fragile: false, needsHandling: false },
  serviceTimeMode: "scheduled",
  scheduledPickupAt: pickupAt,
  selectedVehicleModelId: "z2",
  dispatchSource: "nearby",
}));
assert.ok(fleetService.recommend({ draft: completedScheduled }).every((offer) => offer.supplySource === "headquarters"));
const scheduledQuote = pricingService.quote({ draft: completedScheduled, modelId: "z2" });
draftService.attachQuote(scheduledDraft.id, scheduledQuote.id, computeInputFingerprint(completedScheduled, "z2"));
const scheduledOrder = orderService.create({ draftId: scheduledDraft.id, quoteId: scheduledQuote.id, requestId: "scheduled-review" });
assert.equal(scheduledOrder.status, "pending_headquarters_review");
assert.equal(scheduledOrder.dispatchSource, "headquarters");
orderService.reviewHeadquarters({ orderId: scheduledOrder.id, reviewerId: "future_admin", decision: "approved" });
paymentService.payMock({ orderId: scheduledOrder.id, requestId: "scheduled-payment", scenario: "success" });
assert.equal(orderService.dispatchReadyOrder(scheduledOrder.id).status, "scheduled");
advanceDemoClock(100);
const dispatchedScheduled = orderService.dispatchReadyOrder(scheduledOrder.id);
assert.equal(dispatchedScheduled.status, "dispatched");
assert.equal(repo.getVehicle(dispatchedScheduled.assignedVehicleId).modelId, "z2");
assert.equal(dispatchedScheduled.assignedVehicleId, "veh_nearest_test");
resetDemoClock();

// Incompatible models remain selectable, but cannot be approved for impossible cargo.
replaceDBForTests(createSeedDatabase());
sessionStore.setAuthenticatedUser("usr_customer_001", "owner_001");
const badAddresses = repo.listAddresses("usr_customer_001");
const badDraft = draftService.create();
const badCompleted = draftService.update(badDraft.id, (current) => ({
  ...current,
  sender: { ...badAddresses[0], sourceAddressId: badAddresses[0].id },
  receiver: { ...badAddresses[1], sourceAddressId: badAddresses[1].id },
  cargo: { category: "document", description: "超重货物", quantity: 1, unitWeightGrams: 250000, fragile: false, needsHandling: false },
  selectedVehicleModelId: "z2",
  dispatchSource: "nearby",
}));
const badOffer = fleetService.recommend({ draft: badCompleted }).find((offer) => offer.modelId === "z2");
assert.equal(badOffer.available, false);
assert.equal(badOffer.supplySource, "headquarters");
const badQuote = pricingService.quote({ draft: badCompleted, modelId: "z2" });
draftService.attachQuote(badDraft.id, badQuote.id, computeInputFingerprint(badCompleted, "z2"));
const badOrder = orderService.create({ draftId: badDraft.id, quoteId: badQuote.id, requestId: "incompatible-review" });
assert.equal(badOrder.status, "pending_headquarters_review");
assert.throws(() => orderService.reviewHeadquarters({ orderId: badOrder.id, reviewerId: "future_admin", decision: "approved" }), /无法承运/);
assert.equal(orderService.reviewHeadquarters({ orderId: badOrder.id, reviewerId: "future_admin", decision: "rejected", reason: "超出额定载重" }).status, "failed");

console.log("[booking-flow] 附近派车、总部待审、预约按时派车及不适配审核通过");
