"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const storage = new Map();
let appDefinition;
let pageDefinition;
let lastModal;
let lastNavigation;
let navigationCalls = 0;
let failNextNavigation = false;
let locationCalls = 0;
let chooseLocationCalls = 0;
let chooseLocationCenter;
let geocodeCalls = 0;
let geocodeApiStatus = 0;
const mapMoves = [];

global.wx = {
  getStorageSync(key) { return storage.has(key) ? storage.get(key) : ""; },
  setStorageSync(key, value) { storage.set(key, value); },
  removeStorageSync(key) { storage.delete(key); },
  getFileSystemManager() { return { readFileSync() { throw new Error("no env file"); } }; },
  getWindowInfo() { return { statusBarHeight: 24, windowWidth: 375, windowHeight: 724 }; },
  getMenuButtonBoundingClientRect() { return { top: 28, left: 270, bottom: 60, height: 32 }; },
  nextTick(callback) { callback(); },
  createMapContext(id) {
    assert.equal(id, "map");
    return { moveToLocation(point) { mapMoves.push(point); } };
  },
  getLocation({ success }) {
    locationCalls += 1;
    success({ latitude: 31.2304, longitude: 121.4737 });
  },
  chooseLocation({ latitude, longitude, success }) {
    chooseLocationCalls += 1;
    chooseLocationCenter = { latitude, longitude };
    success({ latitude: 28.682, longitude: 116.032, name: "瑶湖图书馆", address: "江西省南昌市" });
  },
  request({ url, success }) {
    assert.match(url, /\/ws\/geocoder\/v1/);
    geocodeCalls += 1;
    if (geocodeApiStatus) {
      success({ statusCode: 200, data: { status: geocodeApiStatus, message: "quota exhausted" } });
      return;
    }
    success({ statusCode: 200, data: { status: 0, result: {
      address: "上海市黄浦区人民大道200号",
      formatted_addresses: { recommend: "人民广场" },
      ad_info: { adcode: "310101" },
    } } });
  },
  navigateTo(options) {
    navigationCalls += 1;
    lastNavigation = options.url;
    if (failNextNavigation) {
      failNextNavigation = false;
      options.fail?.({ errMsg: "mock navigation failure" });
    }
  },
  showModal(options) { lastModal = options; },
};
global.App = (definition) => { appDefinition = definition; };
global.Page = (definition) => { pageDefinition = definition; };

require("../miniprogram/app.js");
assert.ok(appDefinition);
appDefinition.onLaunch.call(appDefinition);
assert.ok(storage.has("cly:prototype:v1:db"), "business data must be persisted in WeChat storage");

const { getDB } = require("../miniprogram/repositories/local-database.js");
assert.ok(getDB().users.length > 0, "local business session must have a user");
assert.ok(getDB().vehicles.length > 0, "local booking flow needs vehicles");

require("../miniprogram/pages/home/index.js");
assert.ok(pageDefinition);
pageDefinition.data = { ...pageDefinition.data };
pageDefinition.setData = function setData(patch, callback) {
  Object.assign(this.data, patch);
  if (callback) callback();
};
pageDefinition.onLoad.call(pageDefinition);
assert.equal(locationCalls, 1);
assert.equal(pageDefinition.data.topBarOffset, 28);
assert.equal(pageDefinition.data.topBarRight, 113);
assert.equal(pageDefinition.data.bottomCardHeight, 239);
assert.equal(pageDefinition.data.floatActionsOffset, 251);
pageDefinition.onStartOrder.call(pageDefinition);
assert.equal(lastNavigation, "/pages/address-step/index");
const firstOrderNavigationCount = navigationCalls;
pageDefinition.onStartOrder.call(pageDefinition);
assert.equal(navigationCalls, firstOrderNavigationCount, "rapid taps must only open one order flow");
assert.equal(pageDefinition.data.openingOrder, true);
pageDefinition.onShow.call(pageDefinition);
failNextNavigation = true;
pageDefinition.onStartOrder.call(pageDefinition);
assert.equal(pageDefinition.data.openingOrder, false, "failed navigation must release the loading state");
pageDefinition.onCallSupport.call(pageDefinition);
assert.equal(pageDefinition.data.supportContactOpen, true);
pageDefinition.onOpenSupportTickets.call(pageDefinition);
assert.equal(pageDefinition.data.supportContactOpen, false);
assert.equal(lastNavigation, "/packages/account/pages/support/index");

const appConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "../miniprogram/app.json"), "utf8"));
assert.deepEqual(appConfig.preloadRule["pages/home/index"].packages, ["packages/delivery"]);
assert.ok(appConfig.pages.includes("pages/address-step/index"), "first booking step must be in the main package");
assert.ok(!appConfig.subpackages.some((pack) => pack.pages.includes("pages/address-step/index")));

const markup = fs.readFileSync(path.join(__dirname, "../miniprogram/pages/home/index.wxml"), "utf8");
assert.ok(markup.includes("<map"));
assert.ok(markup.includes('show-location="{{hasRealLocation}}"'));
assert.ok(!markup.includes("你在这里"));
assert.ok(!markup.includes("演示车型"));
assert.ok(!markup.includes("region-caret"));
assert.ok(markup.includes('class="region-chevron"'));
assert.ok(!markup.includes('class="region-sub"'));
assert.ok(markup.includes('style="height: {{bottomCardHeight}}px;"'));
assert.ok(markup.includes("欢迎使用无人配送服务"));
assert.ok(markup.includes("/assets/vehicles/delivery-pod.png"));
const stylesheet = fs.readFileSync(path.join(__dirname, "../miniprogram/pages/home/index.wxss"), "utf8");
assert.match(stylesheet, /\.capacity-row\s*\{[^}]*flex:\s*1 1 auto;/);
assert.match(stylesheet, /\.capacity-vehicle\s*\{[^}]*transform:\s*scaleX\(-1\)/);
assert.doesNotMatch(stylesheet, /margin-top:\s*auto/);
assert.ok(!stylesheet.includes("calc(27rpx + var(--safe-bottom))"));

setTimeout(async () => {
  assert.equal(pageDefinition.data.hasRealLocation, true);
  assert.equal(pageDefinition.data.mapLat, 31.2304);
  assert.equal(pageDefinition.data.mapLng, 121.4737);
  assert.equal(geocodeCalls, 1);
  assert.equal(pageDefinition.data.regionLabel, "人民广场");
  assert.equal(pageDefinition.data.regionSub, "上海市黄浦区人民大道200号");
  assert.doesNotMatch(pageDefinition.data.regionSub, /\d+\.\d+/);
  assert.equal(pageDefinition.data.markers.length, 0, "distant demo vehicles must not appear as nearby capacity");
  pageDefinition.onPickRegion.call(pageDefinition);
  assert.equal(chooseLocationCalls, 1);
  assert.deepEqual(chooseLocationCenter, { latitude: 31.2304, longitude: 121.4737 });
  assert.equal(pageDefinition.data.regionLabel, "瑶湖图书馆");
  assert.equal(pageDefinition.data.regionSub, "江西省南昌市");
  assert.equal(pageDefinition.data.locationMode, "selected");
  assert.equal(storage.get("homeSelectedPlaceLabel"), "瑶湖图书馆");
  storage.set("selectedPlaceLabel", "订单寄件地");
  pageDefinition.onLoad.call(pageDefinition);
  assert.equal(locationCalls, 1, "saved choice should bypass GPS on the next visit");
  assert.equal(pageDefinition.data.regionLabel, "瑶湖图书馆");
  assert.equal(pageDefinition.data.regionSub, "江西省南昌市");
  global.wx.chooseLocation = ({ fail }) => fail({ errMsg: "chooseLocation:fail cancel" });
  pageDefinition.onPickRegion.call(pageDefinition);
  assert.equal(pageDefinition.data.regionLabel, "瑶湖图书馆", "cancelling the native picker keeps the current place");
  global.wx.getLocation = ({ fail }) => fail(new Error("permission denied"));
  const originalWarn = console.warn;
  console.warn = () => {};
  await pageDefinition.refreshLocation.call(pageDefinition);
  console.warn = originalWarn;
  assert.equal(pageDefinition.data.regionLabel, "瑶湖图书馆", "GPS failure keeps the chosen place");
  global.wx.getLocation = ({ success }) => success({ latitude: 31.2304, longitude: 121.4737 });
  pageDefinition.data.selectedMarkerId = 1;
  pageDefinition.data.mapScale = 20;
  geocodeApiStatus = 121;
  console.warn = () => {};
  await pageDefinition.onLocateMe.call(pageDefinition);
  await new Promise(setImmediate);
  console.warn = originalWarn;
  assert.equal(pageDefinition.data.locationMode, "gps");
  assert.equal(pageDefinition.data.selectedMarkerId, null, "locate-me closes the vehicle drawer");
  assert.equal(pageDefinition.data.mapScale, 16, "locate-me restores the default map zoom");
  assert.deepEqual(mapMoves.at(-1), { latitude: 31.2304, longitude: 121.4737 });
  assert.equal(pageDefinition.data.regionLabel, "点击选择地点", "quota errors offer native place selection");
  assert.equal(storage.has("homeSelectedPlaceLabel"), false, "locate-me clears the saved manual selection");
  assert.equal(storage.get("selectedPlaceLabel"), "订单寄件地", "home selection must not erase delivery choices");
  console.log("[home-smoke] native place selection, saved place, GPS, booking and support contact card");
}, 0);
