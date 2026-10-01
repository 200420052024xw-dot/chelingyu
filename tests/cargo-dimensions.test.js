"use strict";

const assert = require("node:assert/strict");

const storage = new Map();
let page;
let lastNavigation;
global.wx = {
  getStorageSync(key) { return storage.get(key) || ""; },
  setStorageSync(key, value) { storage.set(key, value); },
  removeStorageSync(key) { storage.delete(key); },
  getFileSystemManager() { return { readFileSync() { throw new Error("no env file"); } }; },
  navigateTo({ url }) { lastNavigation = url; },
  showToast() { throw new Error("valid cargo should not show a toast"); },
};
global.Page = (definition) => { page = definition; };

const { replaceDBForTests } = require("../miniprogram/repositories/local-database.js");
const { createSeedDatabase } = require("../miniprogram/fixtures/seed.js");
const { draftService } = require("../miniprogram/services/draft.js");
const { repo } = require("../miniprogram/repositories/index.js");
const { sessionStore } = require("../miniprogram/stores/session.js");
replaceDBForTests(createSeedDatabase());
sessionStore.setAuthenticatedUser("usr_customer_001", "owner_001");
const draft = draftService.create();
draftService.update(draft.id, (current) => ({
  ...current,
  cargo: {
    category: "general", description: "纸箱", quantity: 1, fragile: false, needsHandling: false,
    unitDimensionsMm: { length: 1250, width: 500, height: 750 },
  },
}));

require("../miniprogram/packages/delivery/pages/cargo-step/index.js");
page.data = { ...page.data };
page.setData = function (patch) { Object.assign(this.data, patch); };
page.onLoad.call(page, { draftId: draft.id });
assert.deepEqual(
  [page.data.lengthMeters, page.data.widthMeters, page.data.heightMeters],
  ["1.25", "0.5", "0.75"],
);

page.onDescriptionInput.call(page, { detail: { value: "新货物" } });
page.onLengthInput.call(page, { detail: { value: "1.3" } });
page.onWidthInput.call(page, { detail: { value: "0.42" } });
page.onHeightInput.call(page, { detail: { value: "0.8" } });
page.onNext.call(page);
assert.deepEqual(repo.getDraft(draft.id).cargo.unitDimensionsMm, { length: 1300, width: 420, height: 800 });
assert.equal(repo.getDraft(draft.id).cargo.description, "新货物");
assert.equal(lastNavigation, `/packages/delivery/pages/model-step/index?draftId=${draft.id}`);
console.log("[cargo-dimensions] meters input and millimeters storage round trip passed");
