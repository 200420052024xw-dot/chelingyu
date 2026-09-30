"use strict";
/** 本地数据库仓储 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeDB = subscribeDB;
exports.getDB = getDB;
exports.commitDB = commitDB;
exports.resetDB = resetDB;
exports.replaceDBForTests = replaceDBForTests;
exports.bootstrapLocalDatabase = bootstrapLocalDatabase;
const seed_1 = require("../fixtures/seed");
const storage_1 = require("../adapters/storage");
const index_1 = require("../config/index");
const inMemoryDB = { db: null };
const listeners = new Set();
function subscribeDB(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
function getDB() {
    if (!inMemoryDB.db) {
        inMemoryDB.db = loadOrInit();
    }
    return inMemoryDB.db;
}
/** 写入并广播（必须在 commit 调用之后调用此函数以持久化） */
function commitDB() {
    if (!inMemoryDB.db)
        return;
    storage_1.storage.write(storage_1.storageKeys.database, inMemoryDB.db);
    listeners.forEach((fn) => {
        try {
            fn();
        }
        catch (e) {
            console.warn("[subscribeDB] listener error", e);
        }
    });
}
/** 将本地业务数据恢复到初始状态。 */
function resetDB() {
    const seed = (0, seed_1.createSeedDatabase)();
    seed.schemaVersion = index_1.APP_CONFIG.schemaVersion;
    inMemoryDB.db = seed;
    storage_1.storage.write(storage_1.storageKeys.database, seed);
    listeners.forEach((fn) => fn());
}
/** 仅用于自动化测试注入独立测试数据。 */
function replaceDBForTests(db) {
    inMemoryDB.db = db;
    storage_1.storage.write(storage_1.storageKeys.database, db);
    listeners.forEach((fn) => fn());
}
function bootstrapLocalDatabase() {
    if (!inMemoryDB.db) {
        inMemoryDB.db = loadOrInit();
    }
}
function loadOrInit() {
    const stored = storage_1.storage.read(storage_1.storageKeys.database, null);
    if (stored && stored.schemaVersion === index_1.APP_CONFIG.schemaVersion) {
        return stored;
    }
    if (stored && stored.schemaVersion === 1) {
        const migrated = (0, seed_1.createSeedDatabase)();
        const preservedCollections = [
            "users", "addresses", "regions", "serviceAreas", "vehicleOwners", "vehicles",
            "availabilityRules", "reservations", "drafts", "quotes", "pricingPolicies", "orders",
            "orderEvents", "payments", "refunds", "revenueSharingRules", "revenueAllocations",
            "notifications", "supportTickets",
        ];
        for (const key of preservedCollections) {
            const oldValue = stored[key];
            if (Array.isArray(oldValue))
                migrated[key] = oldValue;
        }
        const modelAliases = {
            model_box_small: "z2",
            model_box_medium: "z5-2026",
            model_cold_chain: "z5-c",
        };
        migrated.vehicles = migrated.vehicles.map((vehicle) => {
            var _a;
            return (Object.assign(Object.assign({}, vehicle), { modelId: (_a = modelAliases[vehicle.modelId]) !== null && _a !== void 0 ? _a : vehicle.modelId, imageUrls: ["/assets/vehicles/autonomous-truck.png"] }));
        });
        migrated.drafts = migrated.drafts.map((draft) => {
            var _a;
            return (Object.assign(Object.assign({}, draft), { selectedVehicleModelId: draft.selectedVehicleModelId
                    ? (_a = modelAliases[draft.selectedVehicleModelId]) !== null && _a !== void 0 ? _a : draft.selectedVehicleModelId
                    : undefined, selectedQuoteId: undefined, inputFingerprint: undefined }));
        });
        migrated.schemaVersion = index_1.APP_CONFIG.schemaVersion;
        storage_1.storage.write(storage_1.storageKeys.database, migrated);
        return migrated;
    }
    const seed = (0, seed_1.createSeedDatabase)();
    seed.schemaVersion = index_1.APP_CONFIG.schemaVersion;
    storage_1.storage.write(storage_1.storageKeys.database, seed);
    return seed;
}
