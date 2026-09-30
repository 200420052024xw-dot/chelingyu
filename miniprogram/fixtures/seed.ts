/** 自洽种子数据。 */

import type {
  Address,
  CargoInfo,
  DeliveryAddressSnapshot,
  DeliveryOrder,
  GeoPoint,
  Notification,
  OrderDraft,
  OrderStatusEvent,
  Payment,
  PricingPolicy,
  Quote,
  Refund,
  RevenueAllocation,
  RevenueSharingRule,
  Region,
  ServiceArea,
  SupportTicket,
  User,
  Vehicle,
  VehicleAvailabilityRule,
  VehicleModel,
  VehicleOwner,
  VehicleReservation,
} from "../contracts/types";
import { APP_CONFIG } from "../config/index";
import { VEHICLE_CATALOG } from "../content/vehicle-products";
import { applyUserMockData } from "./load-user-mock-data";

const T = "2026-09-22T09:00:00+08:00";

export interface LocalDatabase {
  schemaVersion: number;
  users: User[];
  addresses: Address[];
  regions: Region[];
  serviceAreas: ServiceArea[];
  vehicleOwners: VehicleOwner[];
  vehicleModels: VehicleModel[];
  vehicles: Vehicle[];
  availabilityRules: VehicleAvailabilityRule[];
  reservations: VehicleReservation[];
  drafts: OrderDraft[];
  quotes: Quote[];
  pricingPolicies: PricingPolicy[];
  orders: DeliveryOrder[];
  orderEvents: OrderStatusEvent[];
  payments: Payment[];
  refunds: Refund[];
  revenueSharingRules: RevenueSharingRule[];
  revenueAllocations: RevenueAllocation[];
  notifications: Notification[];
  supportTickets: SupportTicket[];
}

function tNow(offsetMin = 0): string {
  const base = new Date(T).getTime() + offsetMin * 60 * 1000;
  return new Date(base).toISOString();
}

export function createSeedDatabase(): LocalDatabase {
  // ============== Region/ServiceArea ==============
  const regions: Region[] = [
    {
      id: "region_province_jx",
      code: "360000",
      name: "江西省",
      level: "province",
      timezone: "Asia/Shanghai",
      enabled: true,
      createdAt: T,
      updatedAt: T,
    },
    {
      id: "region_city_nc",
      code: "360100",
      name: "南昌市",
      level: "city",
      parentId: "region_province_jx",
      timezone: "Asia/Shanghai",
      enabled: true,
      createdAt: T,
      updatedAt: T,
    },
    {
      id: "region_district_qh",
      code: "360111",
      name: "南昌县",
      level: "district",
      parentId: "region_city_nc",
      timezone: "Asia/Shanghai",
      enabled: true,
      createdAt: T,
      updatedAt: T,
    },
    {
      id: "region_yaohu",
      code: "360111",
      name: "瑶湖校区服务区",
      level: "district",
      parentId: "region_city_nc",
      timezone: "Asia/Shanghai",
      enabled: true,
      createdAt: T,
      updatedAt: T,
    },
  ];

  const serviceAreas: ServiceArea[] = [
    {
      id: "service_yaohu",
      name: "瑶湖校区",
      regionId: "region_district_qh",
      center: APP_CONFIG.demoCenter,
      radiusMeters: 3000,
      enabled: true,
      createdAt: T,
      updatedAt: T,
    },
  ];

  // ============== User ==============
  const users: User[] = [
    {
      id: APP_CONFIG.demoUserId,
      nickname: "测试用户",
      avatarUrl: "",
      roles: ["customer", "vehicle_owner"],
      status: "active",
      createdAt: T,
      updatedAt: T,
    },
  ];

  const vehicleOwners: VehicleOwner[] = [
    {
      id: APP_CONFIG.demoOwnerId,
      userId: APP_CONFIG.demoUserId,
      subjectType: "individual",
      displayName: "测试车主",
      verificationStatus: "verified",
      createdAt: T,
      updatedAt: T,
    },
  ];

  // ============== Address ==============
  const addresses: Address[] = [
    {
      id: "addr_library",
      userId: APP_CONFIG.demoUserId,
      label: "school",
      name: "江西师范大学（瑶湖校区）图书馆",
      contactName: "测试用户",
      contactMobile: "138****0000",
      regionCode: "360111",
      detail: "江西师范大学瑶湖校区图书馆",
      location: { latitude: 28.6829, longitude: 115.8582 },
      isDefaultSender: true,
      isDefaultReceiver: false,
      createdAt: T,
      updatedAt: T,
    },
    {
      id: "addr_stadium_east",
      userId: APP_CONFIG.demoUserId,
      label: "school",
      name: "瑶湖体育场东门",
      contactName: "测试用户",
      contactMobile: "138****0000",
      regionCode: "360111",
      detail: "瑶湖体育场东门",
      location: { latitude: 28.6841, longitude: 115.8711 },
      isDefaultSender: false,
      isDefaultReceiver: true,
      createdAt: T,
      updatedAt: T,
    },
    {
      id: "addr_dorm_5",
      userId: APP_CONFIG.demoUserId,
      label: "school",
      name: "学生公寓 5 号楼",
      contactName: "测试用户",
      contactMobile: "138****0000",
      regionCode: "360111",
      detail: "学生公寓 5 号楼",
      location: { latitude: 28.6798, longitude: 115.8539 },
      isDefaultSender: false,
      isDefaultReceiver: false,
      createdAt: T,
      updatedAt: T,
    },
  ];

  // ============== Vehicle Models ==============
  const vehicleModels: VehicleModel[] = VEHICLE_CATALOG.map((model) => ({
    id: model.id,
    code: model.code,
    name: model.name,
    category: model.category,
    description: model.description,
    imageUrl: model.image,
    maxLoadGrams: model.loadKg * 1000,
    cargoVolumeLiters: model.volumeLiters,
    cargoBoxDimensionsMm: model.dimensions,
    energyType: "electric",
    supportsColdChain: model.cold,
    supportedCargoCategories: model.cold ? ["fresh_cold_chain", "food", "medical"] : ["general", "document", "food", "medical", "other"],
    enabled: true,
    createdAt: T,
    updatedAt: T,
  }));
  // ============== Vehicles ==============
  const vehicles: Vehicle[] = [
    {
      id: "veh_001",
      vehicleNo: "CLY-NC-001",
      modelId: "z2",
      ownerId: APP_CONFIG.demoOwnerId,
      serviceRegionId: "region_yaohu",
      deviceId: "dev_001",
      serialNumber: "SN-001",
      licensePlate: "赣A-D0001",
      status: "available",
      location: { latitude: 28.6852, longitude: 115.8612 },
      locationUpdatedAt: T,
      batteryPercent: 78,
      remainingRangeMeters: 35000,
      imageUrls: ["/assets/vehicles/autonomous-truck.png"],
      enabled: true,
      ownerShared: true,
      createdAt: T,
      updatedAt: T,
    },
    {
      id: "veh_002",
      vehicleNo: "CLY-NC-002",
      modelId: "z5-2026",
      ownerId: APP_CONFIG.demoOwnerId,
      serviceRegionId: "region_yaohu",
      deviceId: "dev_002",
      status: "available",
      location: { latitude: 28.6804, longitude: 115.8635 },
      locationUpdatedAt: T,
      batteryPercent: 65,
      remainingRangeMeters: 28000,
      imageUrls: ["/assets/vehicles/autonomous-truck.png"],
      enabled: true,
      ownerShared: true,
      createdAt: T,
      updatedAt: T,
    },
    {
      id: "veh_003",
      vehicleNo: "CLY-NC-003",
      modelId: "z5-c",
      ownerId: APP_CONFIG.demoOwnerId,
      serviceRegionId: "region_yaohu",
      deviceId: "dev_003",
      status: "available",
      location: { latitude: 28.6778, longitude: 115.8501 },
      locationUpdatedAt: T,
      batteryPercent: 82,
      remainingRangeMeters: 42000,
      imageUrls: ["/assets/vehicles/autonomous-truck.png"],
      enabled: true,
      ownerShared: true,
      createdAt: T,
      updatedAt: T,
    },
    {
      // 用于演示"无可用车"场景的预绑定车辆
      id: "veh_004",
      vehicleNo: "CLY-NC-004",
      modelId: "z2",
      ownerId: APP_CONFIG.demoOwnerId,
      serviceRegionId: "region_yaohu",
      deviceId: "dev_004",
      status: "available",
      location: { latitude: 28.684, longitude: 115.86 },
      locationUpdatedAt: T,
      batteryPercent: 60,
      remainingRangeMeters: 30000,
      imageUrls: ["/assets/vehicles/autonomous-truck.png"],
      enabled: true,
      ownerShared: true,
      createdAt: T,
      updatedAt: T,
    },
    {
      // 未绑定的演示车辆
      id: "veh_demo_unbound_001",
      vehicleNo: "CLY-NC-101",
      modelId: "z2",
      ownerId: "owner_demo_unbound",
      serviceRegionId: "region_yaohu",
      deviceId: "dev_101",
      status: "available",
      location: { latitude: 28.681, longitude: 115.866 },
      locationUpdatedAt: T,
      batteryPercent: 72,
      remainingRangeMeters: 32000,
      imageUrls: ["/assets/vehicles/autonomous-truck.png"],
      enabled: true,
      ownerShared: false,
      createdAt: T,
      updatedAt: T,
    },
    {
      id: "veh_demo_unbound_002",
      vehicleNo: "CLY-NC-102",
      modelId: "z5-c",
      ownerId: "owner_demo_unbound",
      serviceRegionId: "region_yaohu",
      deviceId: "dev_102",
      status: "available",
      location: { latitude: 28.6788, longitude: 115.864 },
      locationUpdatedAt: T,
      batteryPercent: 90,
      remainingRangeMeters: 50000,
      imageUrls: ["/assets/vehicles/autonomous-truck.png"],
      enabled: true,
      ownerShared: false,
      createdAt: T,
      updatedAt: T,
    },
  ];

  // ============== Availability ==============
  const availabilityRules: VehicleAvailabilityRule[] = vehicles
    .filter((v) => v.ownerId === APP_CONFIG.demoOwnerId)
    .map((v) => ({
      id: `availability_${v.id}`,
      vehicleId: v.id,
      timezone: "Asia/Shanghai",
      ranges: [{ weekdays: [1, 2, 3, 4, 5, 6, 7] as Array<1 | 2 | 3 | 4 | 5 | 6 | 7>, startTime: "08:00", endTime: "22:00" }],
      enabled: true,
      createdAt: T,
      updatedAt: T,
    }));

  // ============== Pricing & Sharing ==============
  const pricingPolicies: PricingPolicy[] = [
    {
      id: "pricing_district_001",
      name: "瑶湖校区标准配送价格",
      scope: "district",
      regionId: "region_yaohu",
      version: 1,
      minimumOrderAmountFen: 500,
      maximumOrderAmountFen: 1500,
      baseFeeFen: 500,
      includedDistanceMeters: 0,
      extraDistanceFeeFenPerKm: 200,
      effectiveFrom: "2026-09-01T00:00:00+08:00",
      enabled: true,
      createdAt: T,
      updatedAt: T,
    },
  ];

  const revenueSharingRules: RevenueSharingRule[] = [
    {
      id: "rule_district_001",
      name: "瑶湖校区默认分润",
      regionId: "region_yaohu",
      version: 1,
      shares: [
        { recipientType: "platform", basisPoints: 3000 },
        { recipientType: "district_operator", basisPoints: 2000 },
        { recipientType: "vehicle_owner", basisPoints: 5000 },
      ],
      effectiveFrom: "2026-09-01T00:00:00+08:00",
      enabled: true,
      createdAt: T,
      updatedAt: T,
    },
  ];

  // ============== 示例订单（进行中） ==============
  const senderSnap: DeliveryAddressSnapshot = {
    sourceAddressId: "addr_library",
    name: "江西师范大学（瑶湖校区）图书馆",
    contactName: "测试用户",
    contactMobile: "138****0000",
    regionCode: "360111",
    detail: "江西师范大学瑶湖校区图书馆",
    location: { latitude: 28.6829, longitude: 115.8582 },
  };
  const receiverSnap: DeliveryAddressSnapshot = {
    sourceAddressId: "addr_stadium_east",
    name: "瑶湖体育场东门",
    contactName: "测试用户",
    contactMobile: "138****0000",
    regionCode: "360111",
    detail: "瑶湖体育场东门",
    location: { latitude: 28.6841, longitude: 115.8711 },
  };
  const cargo: CargoInfo = {
    category: "document",
    description: "文件 5 份",
    quantity: 1,
    unitWeightGrams: 500,
    unitDimensionsMm: { length: 300, width: 200, height: 100 },
    fragile: false,
    needsHandling: false,
  };

  const exampleOrder: DeliveryOrder = {
    id: "order_example",
    orderNo: "CLY202609220001",
    type: "task_delivery",
    customerId: APP_CONFIG.demoUserId,
    serviceRegionId: "region_yaohu",
    sender: senderSnap,
    receiver: receiverSnap,
    cargo,
    serviceTimeMode: "immediate",
    vehicleSnapshot: {
      vehicleId: "veh_001",
      vehicleModelId: "z2",
      vehicleNo: "CLY-NC-001",
      modelName: "Z2 智能配送车",
      imageUrl: "/assets/vehicles/autonomous-truck.png",
      maxLoadGrams: 200000,
      cargoVolumeLiters: 1500,
      batteryPercent: 78,
    },
    assignedVehicleId: "veh_001",
    acceptedQuoteId: "quote_example",
    priceItems: [
      { type: "base_fee", label: "基础运费", amountFen: 500 },
      { type: "distance_fee", label: "里程费（约1.3km）", amountFen: 260 },
    ],
    totalAmountFen: 760,
    pricingPolicyId: "pricing_district_001",
    pricingPolicyVersion: 1,
    status: "vehicle_to_pickup",
    estimatedPickupAt: tNow(15),
    estimatedDeliveryAt: tNow(25),
    createdAt: tNow(-3),
    updatedAt: tNow(-1),
  };

  const exampleOrderEvents: OrderStatusEvent[] = [
    {
      id: "evt_e1",
      orderId: "order_example",
      toStatus: "pending_payment",
      actorType: "customer",
      actorId: APP_CONFIG.demoUserId,
      occurredAt: tNow(-5),
      note: "用户创建订单",
      createdAt: tNow(-5),
      updatedAt: tNow(-5),
    },
    {
      id: "evt_e2",
      orderId: "order_example",
      fromStatus: "pending_payment",
      toStatus: "paid",
      actorType: "system",
      occurredAt: tNow(-4),
      note: "支付成功",
      createdAt: tNow(-4),
      updatedAt: tNow(-4),
    },
    {
      id: "evt_e3",
      orderId: "order_example",
      fromStatus: "paid",
      toStatus: "matching",
      actorType: "system",
      occurredAt: tNow(-3),
      note: "系统匹配中",
      createdAt: tNow(-3),
      updatedAt: tNow(-3),
    },
    {
      id: "evt_e4",
      orderId: "order_example",
      fromStatus: "matching",
      toStatus: "dispatched",
      actorType: "system",
      occurredAt: tNow(-2),
      note: "已匹配 CLY-NC-001",
      createdAt: tNow(-2),
      updatedAt: tNow(-2),
    },
    {
      id: "evt_e5",
      orderId: "order_example",
      fromStatus: "dispatched",
      toStatus: "vehicle_to_pickup",
      actorType: "vehicle",
      actorId: "veh_001",
      occurredAt: tNow(-1),
      note: "车辆正在前往取件点",
      createdAt: tNow(-1),
      updatedAt: tNow(-1),
    },
  ];

  const examplePayment: Payment = {
    id: "pay_example",
    paymentNo: "PAYSAMPLE0001",
    orderId: "order_example",
    payerUserId: APP_CONFIG.demoUserId,
    channel: "mock",
    amountFen: 760,
    status: "succeeded",
    paidAt: tNow(-4),
    createdAt: tNow(-4),
    updatedAt: tNow(-4),
  };

  // ============== Notifications ==============
  const notifications: Notification[] = [
    {
      id: "notif_001",
      userId: APP_CONFIG.demoUserId,
      type: "order",
      title: "订单已匹配车辆",
      content: "您的订单已匹配到 CLY-NC-001，预计 3 分钟到达。",
      relatedEntityType: "order",
      relatedEntityId: "order_example",
      createdAt: tNow(-2),
      updatedAt: tNow(-2),
    },
    {
      id: "notif_002",
      userId: APP_CONFIG.demoUserId,
      type: "system",
      title: "欢迎使用无人车共享运力",
      content: "订单、车辆和支付流程使用本机模拟数据。",
      createdAt: tNow(-60),
      updatedAt: tNow(-60),
    },
  ];

  const db: LocalDatabase = {
    schemaVersion: APP_CONFIG.schemaVersion,
    users,
    addresses,
    regions,
    serviceAreas,
    vehicleOwners,
    vehicleModels,
    vehicles,
    availabilityRules,
    reservations: [],
    drafts: [],
    quotes: [],
    pricingPolicies,
    orders: [exampleOrder],
    orderEvents: exampleOrderEvents,
    payments: [examplePayment],
    refunds: [],
    revenueSharingRules,
    revenueAllocations: [],
    notifications,
    supportTickets: [],
  };

  // 用户在 user-mock-data.json 中填写的内容会覆盖默认值
  return applyUserMockData(db);
}
