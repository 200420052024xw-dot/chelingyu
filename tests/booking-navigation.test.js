"use strict";

const assert = require("node:assert/strict");

const values = new Map();
const routes = [];
const toasts = [];
const pages = [];
global.wx = {
  getStorageSync(key) { return values.has(key) ? values.get(key) : ""; },
  setStorageSync(key, value) { values.set(key, value); },
  removeStorageSync(key) { values.delete(key); },
  clearStorageSync() { values.clear(); },
  getFileSystemManager() { return { readFileSync() { throw new Error("no fixture override"); } }; },
  navigateTo(options) { routes.push(["navigateTo", options.url]); },
  navigateBack() { routes.push(["navigateBack"]); },
  switchTab(options) { routes.push(["switchTab", options.url]); },
  reLaunch(options) { routes.push(["reLaunch", options.url]); },
  redirectTo(options) { routes.push(["redirectTo", options.url]); },
  showToast(options) { toasts.push(options.title); },
};
global.Page = (options) => pages.push(options);

const { replaceDBForTests } = require("../miniprogram/repositories/local-database.js");
const { createSeedDatabase } = require("../miniprogram/fixtures/seed.js");
const { repo } = require("../miniprogram/repositories/index.js");
const { draftService } = require("../miniprogram/services/draft.js");
const { draftStore } = require("../miniprogram/stores/order-draft.js");
const { fleetService } = require("../miniprogram/services/fleet.js");
const { sessionStore } = require("../miniprogram/stores/session.js");

require("../miniprogram/packages/delivery/pages/model-step/index.js");
require("../miniprogram/packages/delivery/pages/confirm/index.js");
require("../miniprogram/pages/address-step/index.js");
const [modelPage, confirmPage, addressPage] = pages;

function makePage(options, data) {
  return {
    ...options,
    data: { ...data },
    setData(patch) { Object.assign(this.data, patch); },
  };
}

function makeFilledDraft() {
  const addresses = repo.listAddresses("usr_customer_001");
  const created = draftService.create();
  const filled = draftService.update(created.id, (current) => ({
    ...current,
    sender: { ...addresses[0], sourceAddressId: addresses[0].id },
    receiver: { ...addresses[1], sourceAddressId: addresses[1].id },
    cargo: { category: "document", description: "测试包裹", quantity: 1, fragile: false, needsHandling: false },
    selectedVehicleModelId: "z2",
  }));
  const selected = fleetService.recommend({ draft: filled }).find((offer) => offer.modelId === "z2");
  assert.equal(selected.supplySource, "nearby");
  return { draft: filled, selected };
}

function reset() {
  routes.length = 0;
  toasts.length = 0;
  draftStore.clear();
  replaceDBForTests(createSeedDatabase());
  sessionStore.setAuthenticatedUser("usr_customer_001", "owner_001");
  repo.listAvailabilityRules().forEach((rule) => repo.upsertAvailabilityRule({
    ...rule,
    enabled: true,
    ranges: [{ weekdays: [1, 2, 3, 4, 5, 6, 7], startTime: "00:00", endTime: "23:59" }],
  }));
}

// 车型确认只进入核对页；用户退到首页后丢弃本次草稿。
reset();
const first = makeFilledDraft();
const initialOrderCount = repo.listOrders().length;
draftStore.set(first.draft);
const model = makePage(modelPage, {
  draftId: first.draft.id,
  selectedModelId: "z2",
  selected: first.selected,
  returnToConfirm: false,
});
model.onConfirm();
assert.deepEqual(routes, [["navigateTo", `/packages/delivery/pages/confirm/index?draftId=${first.draft.id}`]]);
assert.equal(repo.listOrders().length, initialOrderCount);
assert.ok(repo.getDraft(first.draft.id));
const address = makePage(addressPage, { draftId: first.draft.id, returnToConfirm: false });
address.onUnload();
assert.equal(repo.getDraft(first.draft.id), undefined);
assert.equal(draftStore.get(), null);
const fresh = draftService.create();
assert.notEqual(fresh.id, first.draft.id);
assert.equal(fresh.sender, undefined);
assert.equal(fresh.cargo, undefined);

// 点击支付才创建订单；关闭支付弹窗后显示仍为待支付的订单。
reset();
const second = makeFilledDraft();
const payModel = makePage(modelPage, {
  draftId: second.draft.id,
  selectedModelId: "z2",
  selected: second.selected,
  returnToConfirm: false,
});
payModel.onConfirm();
const confirm = makePage(confirmPage, {
  draftId: second.draft.id,
  submitting: false,
  payProcessing: false,
  createdOrderId: null,
});
confirm.onSubmitOrder();
assert.equal(confirm.data.payModalOpen, true);
assert.equal(repo.getOrder(confirm.data.createdOrderId).status, "pending_payment");
assert.equal(repo.getDraft(second.draft.id), undefined);
const routesBeforeBack = routes.length;
payModel.onShow();
assert.equal(routes.length, routesBeforeBack);
payModel.onConfirm();
assert.equal(routes.length, routesBeforeBack);
assert.equal(toasts.at(-1), "订单已创建，请在订单列表查看");
assert.equal(repo.getOrder(confirm.data.createdOrderId).status, "pending_payment");
confirm.onClosePay();
assert.deepEqual(routes.at(-1), ["redirectTo", `/packages/delivery/pages/detail/index?id=${confirm.data.createdOrderId}`]);
assert.equal(repo.getOrder(confirm.data.createdOrderId).status, "pending_payment");

// 模拟支付处理中退出页面，不应在后台继续支付或把用户拉回订单详情。
reset();
const third = makeFilledDraft();
const processingModel = makePage(modelPage, {
  draftId: third.draft.id,
  selectedModelId: "z2",
  selected: third.selected,
  returnToConfirm: false,
});
processingModel.onConfirm();
const processingConfirm = makePage(confirmPage, {
  draftId: third.draft.id,
  submitting: false,
  payProcessing: false,
  createdOrderId: null,
});
processingConfirm.onSubmitOrder();
const scheduled = [];
const realSetTimeout = global.setTimeout;
try {
  global.setTimeout = (callback) => { scheduled.push(callback); return 1; };
  processingConfirm.onSimulateSuccess();
  processingConfirm.onUnload();
  const routesBeforeProcessingBack = routes.length;
  processingModel.onShow();
  assert.equal(routes.length, routesBeforeProcessingBack);
  scheduled.forEach((callback) => callback());
  assert.equal(repo.getOrder(processingConfirm.data.createdOrderId).status, "pending_payment");
  assert.equal(routes.length, routesBeforeProcessingBack);
} finally {
  global.setTimeout = realSetTimeout;
}

console.log("[booking-navigation] direct confirmation, stepwise back, draft cleanup, and unpaid order passed");
