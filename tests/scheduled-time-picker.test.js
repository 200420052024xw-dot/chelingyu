"use strict";

const assert = require("node:assert/strict");

const storage = new Map();
let page;
global.wx = {
  getStorageSync(key) { return storage.get(key) || ""; },
  setStorageSync(key, value) { storage.set(key, value); },
  removeStorageSync(key) { storage.delete(key); },
  getFileSystemManager() { return { readFileSync() { throw new Error("no env file"); } }; },
};
global.Page = (definition) => { page = definition; };

const { replaceDBForTests } = require("../miniprogram/repositories/local-database.js");
const { createSeedDatabase } = require("../miniprogram/fixtures/seed.js");
const { draftService } = require("../miniprogram/services/draft.js");
const { sessionStore } = require("../miniprogram/stores/session.js");
replaceDBForTests(createSeedDatabase());
sessionStore.setAuthenticatedUser("usr_customer_001", "owner_001");
const draft = draftService.create({
  serviceTimeMode: "scheduled",
  scheduledPickupAt: "2026-12-31T23:58:00+08:00",
});

require("../miniprogram/pages/address-step/index.js");
page.data = { ...page.data };
page.setData = function (patch) { Object.assign(this.data, patch); };
page.onLoad.call(page, { draftId: draft.id });
assert.deepEqual(page.data.timeColumns[1], ["00 分", "05 分", "10 分", "15 分", "20 分", "25 分", "30 分", "35 分", "40 分", "45 分", "50 分", "55 分"]);
assert.equal(page.data.scheduledDate, "2027-01-01");
assert.equal(page.data.scheduledTime, "00:00");
assert.equal(page.data.scheduledIso, "2027-01-01T00:00:00+08:00");

page.onPickDate.call(page, { detail: { value: "2027-01-02" } });
page.onPickTime.call(page, { detail: { value: [9, 7] } });
assert.equal(page.data.scheduledTime, "09:35");
assert.equal(page.data.scheduledIso, "2027-01-02T09:35:00+08:00");
page.onPickTime.call(page, { detail: { value: [18, 11] } });
assert.equal(page.data.scheduledTime, "18:55");
assert.equal(page.data.scheduledIso, "2027-01-02T18:55:00+08:00");
page.onUnload.call(page);
console.log("[scheduled-time] five-minute selection and saved-time alignment passed");
