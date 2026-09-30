/** 本地数据库仓储 */

import type { LocalDatabase } from "../fixtures/seed";
import { createSeedDatabase } from "../fixtures/seed";
import { storage, storageKeys } from "../adapters/storage";
import { APP_CONFIG } from "../config/index";

const inMemoryDB: { db: LocalDatabase | null } = { db: null };

/** 通知数据库已变更，触发订阅者重新拉取 */
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeDB(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getDB(): LocalDatabase {
  if (!inMemoryDB.db) {
    inMemoryDB.db = loadOrInit();
  }
  return inMemoryDB.db;
}

/** 写入并广播（必须在 commit 调用之后调用此函数以持久化） */
export function commitDB(): void {
  if (!inMemoryDB.db) return;
  storage.write(storageKeys.database, inMemoryDB.db);
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn("[subscribeDB] listener error", e);
    }
  });
}

/** 将本地业务数据恢复到初始状态。 */
export function resetDB(): void {
  const seed = createSeedDatabase();
  seed.schemaVersion = APP_CONFIG.schemaVersion;
  inMemoryDB.db = seed;
  storage.write(storageKeys.database, seed);
  listeners.forEach((fn) => fn());
}

/** 仅用于自动化测试注入独立测试数据。 */
export function replaceDBForTests(db: LocalDatabase): void {
  inMemoryDB.db = db;
  storage.write(storageKeys.database, db);
  listeners.forEach((fn) => fn());
}

export function bootstrapLocalDatabase(): void {
  if (!inMemoryDB.db) {
    inMemoryDB.db = loadOrInit();
  }
}

function loadOrInit(): LocalDatabase {
  const stored = storage.read<LocalDatabase | null>(storageKeys.database, null as unknown as LocalDatabase);
  if (stored && stored.schemaVersion === APP_CONFIG.schemaVersion) {
    return stored;
  }
  if (stored && stored.schemaVersion === 1) {
    const migrated = createSeedDatabase();
    const preservedCollections: Array<keyof LocalDatabase> = [
      "users", "addresses", "regions", "serviceAreas", "vehicleOwners", "vehicles",
      "availabilityRules", "reservations", "drafts", "quotes", "pricingPolicies", "orders",
      "orderEvents", "payments", "refunds", "revenueSharingRules", "revenueAllocations",
      "notifications", "supportTickets",
    ];
    for (const key of preservedCollections) {
      const oldValue = stored[key];
      if (Array.isArray(oldValue)) (migrated[key] as unknown[]) = oldValue as unknown[];
    }
    const modelAliases: Record<string, string> = {
      model_box_small: "z2",
      model_box_medium: "z5-2026",
      model_cold_chain: "z5-c",
    };
    migrated.vehicles = migrated.vehicles.map((vehicle) => ({
      ...vehicle,
      modelId: modelAliases[vehicle.modelId] ?? vehicle.modelId,
      imageUrls: ["/assets/vehicles/autonomous-truck.png"],
    }));
    migrated.drafts = migrated.drafts.map((draft) => ({
      ...draft,
      selectedVehicleModelId: draft.selectedVehicleModelId
        ? modelAliases[draft.selectedVehicleModelId] ?? draft.selectedVehicleModelId
        : undefined,
      selectedQuoteId: undefined,
      inputFingerprint: undefined,
    }));
    migrated.schemaVersion = APP_CONFIG.schemaVersion;
    storage.write(storageKeys.database, migrated);
    return migrated;
  }
  const seed = createSeedDatabase();
  seed.schemaVersion = APP_CONFIG.schemaVersion;
  storage.write(storageKeys.database, seed);
  return seed;
}
