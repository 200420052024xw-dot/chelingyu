"use strict";
/**
 * 用户自定义 Mock 数据加载与合并。
 *
 * 设计目标：
 *  - 用户只编辑 `miniprogram/fixtures/user-mock-data.json` 一个文件
 *  - 没填的字段 / 没填的整块都自动沿用 seed.ts 的默认演示数据
 *  - 类型与默认值严格对齐 data_design/types.ts
 *  - 校验金额、坐标、电量、枚举值，越界时打 console.warn 但不抛错（演示用）
 *
 * 该模块由 seed.ts 在 createSeedDatabase() 末尾调用。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyUserMockData = applyUserMockData;
const index_1 = require("../config/index");
// 微信运行时不能 require JSON；使用构建时从 JSON 生成的 JS 模块。
let cached = null;
function loadRaw() {
    if (cached !== null)
        return cached;
    try {
        cached = require("./user-mock-data");
        return cached;
    }
    catch (e) {
        console.warn("[mock-data] 读取 user-mock-data.js 失败，使用默认 seed", e);
        cached = {};
        return cached;
    }
}
const T = "2026-09-22T09:00:00+08:00";
// === 校验工具 ===
function warnOnce(field, message) {
    console.warn(`[mock-data] ${field}: ${message}`);
}
function validateLatLng(field, lat, lng) {
    if (lat < -90 || lat > 90)
        warnOnce(field, `纬度 ${lat} 超出 [-90, 90]`);
    if (lng < -180 || lng > 180)
        warnOnce(field, `经度 ${lng} 超出 [-180, 180]`);
}
function validateBattery(field, value) {
    if (value !== undefined && (value < 0 || value > 100)) {
        warnOnce(field, `电量 ${value} 超出 [0, 100]`);
    }
}
function validateMoneyFen(field, value) {
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        warnOnce(field, `金额 ${value} 必须是 ≥0 的整数（分）`);
    }
}
// === 合并函数 ===
function applyUserMockData(db) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const user = loadRaw();
    if (!user)
        return db;
    // ----- region -----
    if (user.region) {
        const center = user.region.center;
        if (center)
            validateLatLng("region.center", center.latitude, center.longitude);
        // 同步更新 APP_CONFIG.demoCenter（首屏会立即反映）
        if (center) {
            index_1.APP_CONFIG.demoCenter = {
                latitude: center.latitude,
                longitude: center.longitude,
            };
        }
        // 替换 yaohu region / serviceArea
        const yaohu = db.regions.find((r) => r.id === "region_yaohu");
        if (yaohu) {
            if (user.region.label)
                yaohu.name = user.region.label.replace(/^.*?·/, "") + "服务区";
        }
        const sa = db.serviceAreas.find((s) => s.id === "service_yaohu");
        if (sa && center) {
            sa.center = center;
            if (user.region.radiusMeters !== undefined)
                sa.radiusMeters = user.region.radiusMeters;
        }
    }
    // ----- demoUser -----
    if (user.demoUser) {
        const u = db.users.find((x) => x.id === index_1.APP_CONFIG.demoUserId);
        if (u && user.demoUser.nickname)
            u.nickname = user.demoUser.nickname;
    }
    // ----- addresses -----
    if (user.addresses && user.addresses.length > 0) {
        // 校验 + 构造 Address 对象
        const newAddrs = user.addresses.map((a) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            validateLatLng(`address ${a.id}`, a.latitude, a.longitude);
            return {
                id: a.id,
                userId: index_1.APP_CONFIG.demoUserId,
                label: (_a = a.label) !== null && _a !== void 0 ? _a : "other",
                name: a.name,
                contactName: (_d = (_b = a.contactName) !== null && _b !== void 0 ? _b : (_c = user.demoUser) === null || _c === void 0 ? void 0 : _c.nickname) !== null && _d !== void 0 ? _d : "测试用户",
                contactMobile: (_g = (_e = a.contactMobile) !== null && _e !== void 0 ? _e : (_f = user.demoUser) === null || _f === void 0 ? void 0 : _f.mobileMasked) !== null && _g !== void 0 ? _g : "138****0000",
                regionCode: "360111",
                detail: a.detail,
                location: { latitude: a.latitude, longitude: a.longitude },
                isDefaultSender: (_h = a.isDefaultSender) !== null && _h !== void 0 ? _h : false,
                isDefaultReceiver: (_j = a.isDefaultReceiver) !== null && _j !== void 0 ? _j : false,
                createdAt: T,
                updatedAt: T,
            };
        });
        // 替换默认演示地址
        db.addresses = newAddrs;
    }
    // ----- vehicleModels -----
    if (user.vehicleModels && user.vehicleModels.length > 0) {
        const newModels = user.vehicleModels.map((m) => {
            var _a;
            return ({
                id: m.id,
                code: m.code,
                name: m.name,
                category: m.category,
                description: (_a = m.description) !== null && _a !== void 0 ? _a : "",
                imageUrl: m.imagePath,
                maxLoadGrams: m.maxLoadGrams,
                cargoVolumeLiters: m.cargoVolumeLiters,
                cargoBoxDimensionsMm: undefined,
                energyType: "electric",
                supportsColdChain: m.supportsColdChain,
                supportedCargoCategories: ["general", "document", "food", "medical", "other"],
                enabled: true,
                createdAt: T,
                updatedAt: T,
            });
        });
        db.vehicleModels = newModels;
    }
    // ----- vehicles -----
    if (user.vehicles && user.vehicles.length > 0) {
        const modelIds = new Set(db.vehicleModels.map((m) => m.id));
        const newVehicles = user.vehicles.map((v) => {
            var _a, _b, _c, _d;
            validateLatLng(`vehicle ${v.id}`, v.latitude, v.longitude);
            validateBattery(`vehicle ${v.id}.batteryPercent`, v.batteryPercent);
            return {
                id: v.id,
                vehicleNo: v.vehicleNo,
                modelId: v.modelId,
                ownerId: index_1.APP_CONFIG.demoOwnerId,
                serviceRegionId: "region_yaohu",
                deviceId: `dev_${v.id}`,
                status: (_a = v.status) !== null && _a !== void 0 ? _a : "available",
                location: { latitude: v.latitude, longitude: v.longitude },
                locationUpdatedAt: T,
                batteryPercent: (_b = v.batteryPercent) !== null && _b !== void 0 ? _b : 80,
                remainingRangeMeters: (_c = v.remainingRangeMeters) !== null && _c !== void 0 ? _c : 30000,
                imageUrls: v.imagePath ? [v.imagePath] : ["/assets/vehicles/box-small.png"],
                enabled: true,
                ownerShared: (_d = v.ownerShared) !== null && _d !== void 0 ? _d : true,
                createdAt: T,
                updatedAt: T,
            };
        });
        db.vehicles = newVehicles;
    }
    // ----- availability -----
    if (user.availability && user.availability.length > 0) {
        const newRules = user.availability.map((a, idx) => {
            const ranges = [
                {
                    weekdays: a.weekdays,
                    startTime: a.startTime,
                    endTime: a.endTime,
                },
            ];
            return {
                id: `availability_${a.vehicleId}_${idx}`,
                vehicleId: a.vehicleId,
                timezone: "Asia/Shanghai",
                ranges,
                enabled: true,
                createdAt: T,
                updatedAt: T,
            };
        });
        db.availabilityRules = newRules;
    }
    // ----- pricing -----
    if (user.pricing) {
        validateMoneyFen("pricing.baseFeeFen", user.pricing.baseFeeFen);
        validateMoneyFen("pricing.minimumOrderAmountFen", user.pricing.minimumOrderAmountFen);
        validateMoneyFen("pricing.maximumOrderAmountFen", user.pricing.maximumOrderAmountFen);
        validateMoneyFen("pricing.extraDistanceFeeFenPerKm", user.pricing.extraDistanceFeeFenPerKm);
        const newPolicies = [
            {
                id: "pricing_district_001",
                name: (_a = user.pricing.name) !== null && _a !== void 0 ? _a : "瑶湖校区标准配送价格",
                scope: "district",
                regionId: "region_yaohu",
                version: 1,
                minimumOrderAmountFen: (_b = user.pricing.minimumOrderAmountFen) !== null && _b !== void 0 ? _b : 500,
                maximumOrderAmountFen: (_c = user.pricing.maximumOrderAmountFen) !== null && _c !== void 0 ? _c : 150000,
                baseFeeFen: (_d = user.pricing.baseFeeFen) !== null && _d !== void 0 ? _d : 500,
                includedDistanceMeters: (_e = user.pricing.includedDistanceMeters) !== null && _e !== void 0 ? _e : 0,
                extraDistanceFeeFenPerKm: (_f = user.pricing.extraDistanceFeeFenPerKm) !== null && _f !== void 0 ? _f : 200,
                effectiveFrom: "2026-09-01T00:00:00+08:00",
                enabled: true,
                createdAt: T,
                updatedAt: T,
            },
        ];
        db.pricingPolicies = newPolicies;
    }
    // ----- revenueSharing -----
    if (((_g = user.revenueSharing) === null || _g === void 0 ? void 0 : _g.shares) && user.revenueSharing.shares.length > 0) {
        const total = user.revenueSharing.shares.reduce((s, x) => s + x.basisPoints, 0);
        if (total !== 10000) {
            warnOnce("revenueSharing.shares", `合计 ${total} ≠ 10000（万分比），可能导致分润计算失败`);
        }
        const newRule = {
            id: "sharing_default",
            name: (_h = user.revenueSharing.name) !== null && _h !== void 0 ? _h : "瑶湖校区默认分润",
            version: 1,
            shares: user.revenueSharing.shares,
            effectiveFrom: "2026-09-01T00:00:00+08:00",
            enabled: true,
            createdAt: T,
            updatedAt: T,
        };
        db.revenueSharingRules = [newRule];
    }
    // ----- notifications -----
    if (user.notifications && user.notifications.length > 0) {
        const newNotifs = user.notifications.map((n) => {
            var _a;
            return ({
                id: n.id,
                userId: index_1.APP_CONFIG.demoUserId,
                type: n.type,
                title: n.title,
                content: n.content,
                readAt: (_a = n.readAt) !== null && _a !== void 0 ? _a : undefined,
                createdAt: T,
                updatedAt: T,
            });
        });
        db.notifications = newNotifs;
    }
    return db;
}
