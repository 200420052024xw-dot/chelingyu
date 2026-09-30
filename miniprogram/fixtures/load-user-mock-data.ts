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

import type {
  LocalDatabase,
} from "./seed";
import type {
  Address,
  Notification,
  PricingPolicy,
  Region,
  RevenueSharingRule,
  ServiceArea,
  Vehicle,
  VehicleAvailabilityRule,
  VehicleModel,
  CargoCategory,
  EnergyType,
  VehicleCategory,
  VehicleOperationalStatus,
  WeeklyTimeRange,
  RevenueRecipientType,
} from "../contracts/types";

type NotificationType = "order" | "vehicle" | "payment" | "settlement" | "system";
import { APP_CONFIG } from "../config/index";

// === 原始 JSON 结构（用户填的形态，比领域类型少一个字段）===
interface UserMockData {
  region?: {
    label?: string;
    sub?: string;
    center?: { latitude: number; longitude: number };
    radiusMeters?: number;
  };
  demoUser?: {
    nickname?: string;
    avatarText?: string;
    mobileMasked?: string;
  };
  addresses?: Array<{
    id: string;
    name: string;
    detail: string;
    latitude: number;
    longitude: number;
    contactName?: string;
    contactMobile?: string;
    isDefaultSender?: boolean;
    isDefaultReceiver?: boolean;
    label?: "home" | "company" | "school" | "other";
  }>;
  vehicleModels?: Array<{
    id: string;
    code: string;
    name: string;
    category: VehicleCategory;
    description?: string;
    maxLoadGrams: number;
    cargoVolumeLiters: number;
    supportsColdChain: boolean;
    imagePath: string;
  }>;
  vehicles?: Array<{
    id: string;
    vehicleNo: string;
    modelId: string;
    ownerShared?: boolean;
    status?: VehicleOperationalStatus;
    latitude: number;
    longitude: number;
    batteryPercent?: number;
    remainingRangeMeters?: number;
    imagePath?: string;
  }>;
  availability?: Array<{
    vehicleId: string;
    weekdays: Array<1 | 2 | 3 | 4 | 5 | 6 | 7>;
    startTime: string;
    endTime: string;
  }>;
  pricing?: {
    name?: string;
    minimumOrderAmountFen?: number;
    maximumOrderAmountFen?: number;
    baseFeeFen?: number;
    includedDistanceMeters?: number;
    extraDistanceFeeFenPerKm?: number;
  };
  revenueSharing?: {
    name?: string;
    shares?: Array<{
      recipientType: RevenueRecipientType;
      basisPoints: number;
    }>;
  };
  notifications?: Array<{
    id: string;
    type: NotificationType;
    title: string;
    content: string;
    readAt: string | null;
  }>;
}

// 微信运行时不能 require JSON；使用构建时从 JSON 生成的 JS 模块。
let cached: UserMockData | null = null;
function loadRaw(): UserMockData | null {
  if (cached !== null) return cached;
  try {
    cached = require("./user-mock-data") as UserMockData;
    return cached;
  } catch (e) {
    console.warn("[mock-data] 读取 user-mock-data.js 失败，使用默认 seed", e);
    cached = {};
    return cached;
  }
}

const T = "2026-09-22T09:00:00+08:00";

// === 校验工具 ===
function warnOnce(field: string, message: string): void {
  console.warn(`[mock-data] ${field}: ${message}`);
}

function validateLatLng(field: string, lat: number, lng: number): void {
  if (lat < -90 || lat > 90) warnOnce(field, `纬度 ${lat} 超出 [-90, 90]`);
  if (lng < -180 || lng > 180) warnOnce(field, `经度 ${lng} 超出 [-180, 180]`);
}

function validateBattery(field: string, value: number | undefined): void {
  if (value !== undefined && (value < 0 || value > 100)) {
    warnOnce(field, `电量 ${value} 超出 [0, 100]`);
  }
}

function validateMoneyFen(field: string, value: number | undefined): void {
  if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
    warnOnce(field, `金额 ${value} 必须是 ≥0 的整数（分）`);
  }
}

// === 合并函数 ===
export function applyUserMockData(db: LocalDatabase): LocalDatabase {
  const user = loadRaw();
  if (!user) return db;

  // ----- region -----
  if (user.region) {
    const center = user.region.center;
    if (center) validateLatLng("region.center", center.latitude, center.longitude);
    // 同步更新 APP_CONFIG.demoCenter（首屏会立即反映）
    if (center) {
      (APP_CONFIG as any).demoCenter = {
        latitude: center.latitude,
        longitude: center.longitude,
      };
    }
    // 替换 yaohu region / serviceArea
    const yaohu = db.regions.find((r) => r.id === "region_yaohu");
    if (yaohu) {
      if (user.region.label) yaohu.name = user.region.label.replace(/^.*?·/, "") + "服务区";
    }
    const sa = db.serviceAreas.find((s) => s.id === "service_yaohu");
    if (sa && center) {
      sa.center = center;
      if (user.region.radiusMeters !== undefined) sa.radiusMeters = user.region.radiusMeters;
    }
  }

  // ----- demoUser -----
  if (user.demoUser) {
    const u = db.users.find((x) => x.id === APP_CONFIG.demoUserId);
    if (u && user.demoUser.nickname) u.nickname = user.demoUser.nickname;
  }

  // ----- addresses -----
  if (user.addresses && user.addresses.length > 0) {
    // 校验 + 构造 Address 对象
    const newAddrs: Address[] = user.addresses.map((a) => {
      validateLatLng(`address ${a.id}`, a.latitude, a.longitude);
      return {
        id: a.id,
        userId: APP_CONFIG.demoUserId,
        label: a.label ?? "other",
        name: a.name,
        contactName: a.contactName ?? user.demoUser?.nickname ?? "测试用户",
        contactMobile: a.contactMobile ?? user.demoUser?.mobileMasked ?? "138****0000",
        regionCode: "360111",
        detail: a.detail,
        location: { latitude: a.latitude, longitude: a.longitude },
        isDefaultSender: a.isDefaultSender ?? false,
        isDefaultReceiver: a.isDefaultReceiver ?? false,
        createdAt: T,
        updatedAt: T,
      };
    });
    // 替换默认演示地址
    db.addresses = newAddrs;
  }

  // ----- vehicleModels -----
  if (user.vehicleModels && user.vehicleModels.length > 0) {
    const newModels: VehicleModel[] = user.vehicleModels.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      category: m.category,
      description: m.description ?? "",
      imageUrl: m.imagePath,
      maxLoadGrams: m.maxLoadGrams,
      cargoVolumeLiters: m.cargoVolumeLiters,
      cargoBoxDimensionsMm: { length: 0, width: 0, height: 0 },
      energyType: "electric" as EnergyType,
      supportsColdChain: m.supportsColdChain,
      supportedCargoCategories: ["general", "document", "food", "medical", "other"] as CargoCategory[],
      enabled: true,
      createdAt: T,
      updatedAt: T,
    }));
    db.vehicleModels = newModels;
  }

  // ----- vehicles -----
  if (user.vehicles && user.vehicles.length > 0) {
    const modelIds = new Set(db.vehicleModels.map((m) => m.id));
    const newVehicles: Vehicle[] = user.vehicles.map((v) => {
      validateLatLng(`vehicle ${v.id}`, v.latitude, v.longitude);
      validateBattery(`vehicle ${v.id}.batteryPercent`, v.batteryPercent);
      return {
        id: v.id,
        vehicleNo: v.vehicleNo,
        modelId: v.modelId,
        ownerId: APP_CONFIG.demoOwnerId,
        serviceRegionId: "region_yaohu",
        deviceId: `dev_${v.id}`,
        status: v.status ?? "available",
        location: { latitude: v.latitude, longitude: v.longitude },
        locationUpdatedAt: T,
        batteryPercent: v.batteryPercent ?? 80,
        remainingRangeMeters: v.remainingRangeMeters ?? 30000,
        imageUrls: v.imagePath ? [v.imagePath] : ["/assets/vehicles/box-small.png"],
        enabled: true,
        ownerShared: v.ownerShared ?? true,
        createdAt: T,
        updatedAt: T,
      };
    });
    db.vehicles = newVehicles;
  }

  // ----- availability -----
  if (user.availability && user.availability.length > 0) {
    const newRules: VehicleAvailabilityRule[] = user.availability.map((a, idx) => {
      const ranges: WeeklyTimeRange[] = [
        {
          weekdays: a.weekdays,
          startTime: a.startTime as `${number}:${number}`,
          endTime: a.endTime as `${number}:${number}`,
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

    const newPolicies: PricingPolicy[] = [
      {
        id: "pricing_district_001",
        name: user.pricing.name ?? "瑶湖校区标准配送价格",
        scope: "district",
        regionId: "region_yaohu",
        version: 1,
        minimumOrderAmountFen: user.pricing.minimumOrderAmountFen ?? 500,
        maximumOrderAmountFen: user.pricing.maximumOrderAmountFen ?? 150000,
        baseFeeFen: user.pricing.baseFeeFen ?? 500,
        includedDistanceMeters: user.pricing.includedDistanceMeters ?? 0,
        extraDistanceFeeFenPerKm: user.pricing.extraDistanceFeeFenPerKm ?? 200,
        effectiveFrom: "2026-09-01T00:00:00+08:00",
        enabled: true,
        createdAt: T,
        updatedAt: T,
      },
    ];
    db.pricingPolicies = newPolicies;
  }

  // ----- revenueSharing -----
  if (user.revenueSharing?.shares && user.revenueSharing.shares.length > 0) {
    const total = user.revenueSharing.shares.reduce((s, x) => s + x.basisPoints, 0);
    if (total !== 10000) {
      warnOnce(
        "revenueSharing.shares",
        `合计 ${total} ≠ 10000（万分比），可能导致分润计算失败`,
      );
    }
    const newRule: RevenueSharingRule = {
      id: "sharing_default",
      name: user.revenueSharing.name ?? "瑶湖校区默认分润",
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
    const newNotifs: Notification[] = user.notifications.map((n) => ({
      id: n.id,
      userId: APP_CONFIG.demoUserId,
      type: n.type,
      title: n.title,
      content: n.content,
      readAt: n.readAt ?? undefined,
      createdAt: T,
      updatedAt: T,
    }));
    db.notifications = newNotifs;
  }

  return db;
}
