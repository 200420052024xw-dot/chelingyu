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
  setNavigationBarTitle() {},
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
const openingVehicleCount = pageDefinition.data.markers.length;
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
const deliveryPages = appConfig.subpackages.find((pack) => pack.root === "packages/delivery").pages;
assert.ok(deliveryPages.includes("pages/nearby-fleet/index"));
assert.ok(deliveryPages.includes("pages/nearby-vehicle/index"));

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
assert.ok(markup.includes('bindtap="onOpenNearbyVehicles"'));
assert.ok(markup.includes('bindtap="onOpenServiceStatus"'));
assert.ok(!markup.includes("sheet-handle"), "bottom card must not imply it can be dragged");
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
  const { homeDemoFleet } = require("../miniprogram/services/home-demo-fleet.js");
  const initialSnapshot = homeDemoFleet.getSnapshot();
  assert.ok(initialSnapshot.vehicles.length >= 2 && initialSnapshot.vehicles.length <= 6);
  assert.equal(initialSnapshot.vehicles.length, openingVehicleCount, "GPS lookup keeps this opening's simulated count stable");
  assert.equal(pageDefinition.data.markers.length, initialSnapshot.vehicles.length);
  assert.deepEqual(pageDefinition.data.markers.map((item) => item.id), initialSnapshot.vehicles.map((item) => item.markerId));
  pageDefinition.onOpenNearbyVehicles.call(pageDefinition);
  assert.equal(lastNavigation, "/packages/delivery/pages/nearby-fleet/index?mode=vehicles");
  pageDefinition.onOpenServiceStatus.call(pageDefinition);
  assert.equal(lastNavigation, "/packages/delivery/pages/nearby-fleet/index?mode=status");
  pageDefinition.onMarkerTap.call(pageDefinition, { detail: { markerId: initialSnapshot.vehicles[0].markerId } });
  assert.equal(lastNavigation, `/packages/delivery/pages/nearby-vehicle/index?id=${initialSnapshot.vehicles[0].id}`);
  pageDefinition.onShow.call(pageDefinition);
  const reopenedSnapshot = homeDemoFleet.getSnapshot();
  assert.notEqual(reopenedSnapshot.vehicles.length, initialSnapshot.vehicles.length, "each home opening refreshes the visible count");
  assert.equal(pageDefinition.data.markers.length, reopenedSnapshot.vehicles.length);
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
  pageDefinition.data.mapScale = 20;
  geocodeApiStatus = 121;
  console.warn = () => {};
  await pageDefinition.onLocateMe.call(pageDefinition);
  await new Promise(setImmediate);
  console.warn = originalWarn;
  assert.equal(pageDefinition.data.locationMode, "gps");
  assert.equal(pageDefinition.data.mapScale, 16, "locate-me restores the default map zoom");
  assert.deepEqual(mapMoves.at(-1), { latitude: 31.2304, longitude: 121.4737 });
  assert.equal(pageDefinition.data.regionLabel, "点击选择地点", "quota errors offer native place selection");
  assert.equal(storage.has("homeSelectedPlaceLabel"), false, "locate-me clears the saved manual selection");
  assert.equal(storage.get("selectedPlaceLabel"), "订单寄件地", "home selection must not erase delivery choices");
  const currentSnapshot = homeDemoFleet.getSnapshot();
  require("../miniprogram/packages/delivery/pages/nearby-fleet/index.js");
  const fleetPage = pageDefinition;
  fleetPage.data = { ...fleetPage.data };
  fleetPage.setData = function (patch) { Object.assign(this.data, patch); };
  fleetPage.onLoad.call(fleetPage, { mode: "vehicles" });
  assert.equal(fleetPage.data.rows.length, currentSnapshot.vehicles.length);
  assert.ok(fleetPage.data.rows.every((item) => item.coordinateText));
  fleetPage.onOpenVehicle.call(fleetPage, { currentTarget: { dataset: { id: currentSnapshot.vehicles[0].id } } });
  assert.equal(lastNavigation, `/packages/delivery/pages/nearby-vehicle/index?id=${currentSnapshot.vehicles[0].id}`);
  fleetPage.onLoad.call(fleetPage, { mode: "status" });
  assert.equal(fleetPage.data.title, "服务状态");
  require("../miniprogram/packages/delivery/pages/nearby-vehicle/index.js");
  const vehiclePage = pageDefinition;
  vehiclePage.data = { ...vehiclePage.data };
  vehiclePage.setData = function (patch) { Object.assign(this.data, patch); };
  vehiclePage.onLoad.call(vehiclePage, { id: currentSnapshot.vehicles[0].id });
  assert.equal(vehiclePage.data.found, true);
  assert.equal(vehiclePage.data.modelName, fleetPage.data.rows[0].modelName);
  assert.equal(vehiclePage.data.markers[0].latitude, fleetPage.data.rows[0].latitude);
  console.log("[home-smoke] random fleet count, list and detail routes, map recenter, place selection and support");
}, 0);
