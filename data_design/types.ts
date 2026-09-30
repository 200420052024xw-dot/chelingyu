/** 无人车共享运力平台的统一领域类型。 */

export type ID = string;
export type ISODateTime = string;
export type ISODate = string;
export type LocalTime = `${number}:${number}`;
export type MoneyFen = number;
export type DistanceMeter = number;
export type WeightGram = number;
export type LengthMillimeter = number;
export type VolumeLiter = number;
export type Percentage = number;

export interface BaseEntity {
  id: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface DimensionsMm {
  length: LengthMillimeter;
  width: LengthMillimeter;
  height: LengthMillimeter;
}

export type UserRole =
  | "customer"
  | "vehicle_owner"
  | "district_operator"
  | "city_operator"
  | "province_operator"
  | "platform_admin";

export type AccountStatus = "active" | "disabled" | "pending_review";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface User extends BaseEntity {
  openId?: string;
  unionId?: string;
  mobile?: string;
  nickname: string;
  avatarUrl?: string;
  roles: UserRole[];
  status: AccountStatus;
  lastLoginAt?: ISODateTime;
}

export interface Address extends BaseEntity {
  userId: ID;
  label?: "home" | "company" | "school" | "other";
  name: string;
  contactName: string;
  contactMobile: string;
  regionCode: string;
  detail: string;
  location: GeoPoint;
  isDefaultSender: boolean;
  isDefaultReceiver: boolean;
}

/** 下单时保存的地址快照，不能只关联可被用户修改的 Address。 */
export interface DeliveryAddressSnapshot {
  sourceAddressId?: ID;
  name: string;
  contactName: string;
  contactMobile: string;
  regionCode: string;
  detail: string;
  location: GeoPoint;
}

export type RegionLevel = "province" | "city" | "district";

export interface Region extends BaseEntity {
  code: string;
  name: string;
  level: RegionLevel;
  parentId?: ID;
  timezone: string;
  enabled: boolean;
}

export type OperatorLevel = RegionLevel;
export type OperatorStatus = "pending" | "active" | "suspended" | "terminated";

export interface Operator extends BaseEntity {
  name: string;
  level: OperatorLevel;
  regionId: ID;
  parentOperatorId?: ID;
  managerUserId: ID;
  status: OperatorStatus;
}

export type OperatorMemberRole = "owner" | "admin" | "dispatcher" | "finance" | "viewer";

export interface OperatorMembership extends BaseEntity {
  operatorId: ID;
  userId: ID;
  role: OperatorMemberRole;
  status: "active" | "disabled";
}

export type OwnerSubjectType = "individual" | "enterprise" | "platform" | "operator";

export interface VehicleOwner extends BaseEntity {
  userId?: ID;
  subjectType: OwnerSubjectType;
  displayName: string;
  enterpriseName?: string;
  verificationStatus: VerificationStatus;
  settlementAccountId?: ID;
}

export type VehicleCategory = "box_small" | "box_medium" | "cold_chain" | "special";
export type EnergyType = "electric" | "hybrid" | "other";

export interface VehicleModel extends BaseEntity {
  code: string;
  name: string;
  category: VehicleCategory;
  description?: string;
  imageUrl: string;
  maxLoadGrams: WeightGram;
  cargoVolumeLiters: VolumeLiter;
  cargoBoxDimensionsMm?: DimensionsMm;
  energyType: EnergyType;
  supportsColdChain: boolean;
  supportedCargoCategories: CargoCategory[];
  enabled: boolean;
}

export type VehicleOperationalStatus =
  | "available"
  | "reserved"
  | "vehicle_to_pickup"
  | "awaiting_loading"
  | "delivering"
  | "owner_use"
  | "charging"
  | "maintenance"
  | "offline";

export interface Vehicle extends BaseEntity {
  vehicleNo: string;
  modelId: ID;
  ownerId: ID;
  operatorId?: ID;
  serviceRegionId: ID;
  deviceId?: string;
  serialNumber?: string;
  licensePlate?: string;
  status: VehicleOperationalStatus;
  location?: GeoPoint;
  locationUpdatedAt?: ISODateTime;
  batteryPercent?: Percentage;
  remainingRangeMeters?: DistanceMeter;
  currentOrderId?: ID;
  imageUrls: string[];
  enabled: boolean;
}

export interface WeeklyTimeRange {
  weekdays: Array<1 | 2 | 3 | 4 | 5 | 6 | 7>;
  startTime: LocalTime;
  endTime: LocalTime;
}

export interface VehicleAvailabilityRule extends BaseEntity {
  vehicleId: ID;
  timezone: string;
  ranges: WeeklyTimeRange[];
  effectiveFrom?: ISODate;
  effectiveTo?: ISODate;
  enabled: boolean;
}

export interface VehicleTelemetrySnapshot extends BaseEntity {
  vehicleId: ID;
  sampledAt: ISODateTime;
  location: GeoPoint;
  speedKph?: number;
  headingDegree?: number;
  batteryPercent: Percentage;
  remainingRangeMeters?: DistanceMeter;
  online: boolean;
  faultCodes: string[];
}

export type MaintenanceType = "inspection" | "repair" | "battery" | "cleaning" | "other";

export interface VehicleMaintenanceRecord extends BaseEntity {
  vehicleId: ID;
  type: MaintenanceType;
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
  description: string;
  result?: string;
  operatorUserId?: ID;
}

export type CargoCategory =
  | "general"
  | "document"
  | "fresh_cold_chain"
  | "food"
  | "medical"
  | "other";

export interface CargoInfo {
  category: CargoCategory;
  description: string;
  quantity: number;
  unitWeightGrams?: WeightGram;
  unitDimensionsMm?: DimensionsMm;
  fragile: boolean;
  needsHandling: boolean;
  temperatureMinCelsius?: number;
  temperatureMaxCelsius?: number;
  specialRequirements?: string[];
}

export type ServiceTimeMode = "immediate" | "scheduled";

/** 多步骤下单期间使用的临时数据，尚不是正式订单。 */
export interface OrderDraft {
  sender?: DeliveryAddressSnapshot;
  receiver?: DeliveryAddressSnapshot;
  serviceTimeMode: ServiceTimeMode;
  scheduledPickupAt?: ISODateTime;
  cargo?: CargoInfo;
  selectedVehicleId?: ID;
  selectedVehicleModelId?: ID;
  quoteId?: ID;
}

export type OrderType = "task_delivery" | "capacity_reservation";
export type OrderStatus =
  | "draft"
  | "quoted"
  | "pending_payment"
  | "paid"
  | "matching"
  | "dispatched"
  | "vehicle_to_pickup"
  | "awaiting_loading"
  | "delivering"
  | "arrived"
  | "completed"
  | "cancelled"
  | "failed"
  | "refunding"
  | "refunded";

export interface VehicleCapabilitySnapshot {
  vehicleId?: ID;
  vehicleModelId: ID;
  vehicleNo?: string;
  modelName: string;
  imageUrl: string;
  maxLoadGrams: WeightGram;
  cargoVolumeLiters: VolumeLiter;
  batteryPercent?: Percentage;
}

export interface DeliveryOrder extends BaseEntity {
  orderNo: string;
  type: OrderType;
  customerId: ID;
  serviceRegionId: ID;
  operatorId?: ID;
  sender: DeliveryAddressSnapshot;
  receiver: DeliveryAddressSnapshot;
  cargo: CargoInfo;
  serviceTimeMode: ServiceTimeMode;
  scheduledPickupAt?: ISODateTime;
  vehicleSnapshot: VehicleCapabilitySnapshot;
  assignedVehicleId?: ID;
  acceptedQuoteId: ID;
  totalAmountFen: MoneyFen;
  status: OrderStatus;
  estimatedPickupAt?: ISODateTime;
  estimatedDeliveryAt?: ISODateTime;
  actualPickupAt?: ISODateTime;
  actualDeliveryAt?: ISODateTime;
  cancelledAt?: ISODateTime;
  cancellationReason?: string;
  remark?: string;
}

export type PriceItemType =
  | "base_fee"
  | "distance_fee"
  | "time_fee"
  | "vehicle_fee"
  | "cargo_fee"
  | "region_adjustment"
  | "supply_demand_adjustment"
  | "discount";

export interface PriceItem {
  type: PriceItemType;
  label: string;
  amountFen: MoneyFen;
  description?: string;
}

export interface Quote extends BaseEntity {
  orderDraftKey: string;
  customerId: ID;
  vehicleId?: ID;
  vehicleModelId: ID;
  pricingPolicyId: ID;
  pricingPolicyVersion: number;
  routeDistanceMeters: DistanceMeter;
  estimatedArrivalMinutes: number;
  items: PriceItem[];
  totalAmountFen: MoneyFen;
  expiresAt: ISODateTime;
}

export type PricingScope = "platform" | "province" | "city" | "district";

export interface PricingPolicy extends BaseEntity {
  name: string;
  scope: PricingScope;
  regionId?: ID;
  operatorId?: ID;
  parentPolicyId?: ID;
  version: number;
  minimumOrderAmountFen: MoneyFen;
  maximumOrderAmountFen: MoneyFen;
  baseFeeFen: MoneyFen;
  includedDistanceMeters: DistanceMeter;
  extraDistanceFeeFenPerKm: MoneyFen;
  nightMultiplier?: number;
  peakMultiplier?: number;
  effectiveFrom: ISODateTime;
  effectiveTo?: ISODateTime;
  enabled: boolean;
}

export type DispatchStatus = "candidate" | "offered" | "assigned" | "rejected" | "expired";

export interface DispatchRecord extends BaseEntity {
  orderId: ID;
  vehicleId: ID;
  status: DispatchStatus;
  distanceToPickupMeters: DistanceMeter;
  estimatedArrivalMinutes: number;
  score?: number;
  reason?: string;
  decidedAt?: ISODateTime;
}

export type EventActorType = "customer" | "owner" | "operator" | "system" | "vehicle";

export interface OrderStatusEvent extends BaseEntity {
  orderId: ID;
  fromStatus?: OrderStatus;
  toStatus: OrderStatus;
  actorType: EventActorType;
  actorId?: ID;
  occurredAt: ISODateTime;
  location?: GeoPoint;
  note?: string;
}

/** 企业客户的周期性运力预约模板，可按日期生成具体 DeliveryOrder。 */
export interface CapacityReservation extends BaseEntity {
  customerId: ID;
  serviceRegionId: ID;
  vehicleModelId: ID;
  vehicleCount: number;
  weekdays: Array<1 | 2 | 3 | 4 | 5 | 6 | 7>;
  startTime: LocalTime;
  endTime: LocalTime;
  effectiveFrom: ISODate;
  effectiveTo: ISODate;
  status: "pending" | "active" | "paused" | "ended" | "cancelled";
}

export type PaymentStatus = "pending" | "succeeded" | "failed" | "closed" | "refunded";
export type PaymentChannel = "wechat_pay" | "mock" | "enterprise_account";

export interface Payment extends BaseEntity {
  paymentNo: string;
  orderId: ID;
  payerUserId: ID;
  channel: PaymentChannel;
  amountFen: MoneyFen;
  status: PaymentStatus;
  externalTransactionId?: string;
  paidAt?: ISODateTime;
}

export type RefundStatus = "pending" | "processing" | "succeeded" | "failed";

export interface Refund extends BaseEntity {
  refundNo: string;
  orderId: ID;
  paymentId: ID;
  amountFen: MoneyFen;
  reason: string;
  status: RefundStatus;
  completedAt?: ISODateTime;
}

export type RevenueRecipientType =
  | "platform"
  | "province_operator"
  | "city_operator"
  | "district_operator"
  | "vehicle_owner";

export type SettlementStatus = "pending" | "confirmed" | "settling" | "settled" | "failed";

export interface RevenueShareItem {
  recipientType: RevenueRecipientType;
  /** 万分比，全部分配项合计必须等于 10000。 */
  basisPoints: number;
}

export interface RevenueSharingRule extends BaseEntity {
  name: string;
  regionId?: ID;
  version: number;
  shares: RevenueShareItem[];
  effectiveFrom: ISODateTime;
  effectiveTo?: ISODateTime;
  enabled: boolean;
}

export interface RevenueAllocation extends BaseEntity {
  orderId: ID;
  revenueSharingRuleId: ID;
  recipientType: RevenueRecipientType;
  recipientId: ID;
  amountFen: MoneyFen;
  ruleVersion: number;
  status: SettlementStatus;
  settledAt?: ISODateTime;
}

export interface SettlementAccount extends BaseEntity {
  ownerType: "operator" | "vehicle_owner";
  ownerId: ID;
  accountName: string;
  maskedAccountNo?: string;
  status: "pending" | "active" | "disabled";
}

export interface Notification extends BaseEntity {
  userId: ID;
  type: "order" | "vehicle" | "payment" | "settlement" | "system";
  title: string;
  content: string;
  relatedEntityType?: string;
  relatedEntityId?: ID;
  readAt?: ISODateTime;
}

export type SupportTicketStatus = "open" | "processing" | "resolved" | "closed";

export interface SupportTicket extends BaseEntity {
  ticketNo: string;
  creatorUserId: ID;
  orderId?: ID;
  vehicleId?: ID;
  category: "order" | "vehicle" | "payment" | "complaint" | "other";
  description: string;
  imageUrls: string[];
  status: SupportTicketStatus;
  assigneeUserId?: ID;
  resolvedAt?: ISODateTime;
}

export interface AuditLog extends BaseEntity {
  actorUserId?: ID;
  actorRole: UserRole | "system";
  action: string;
  entityType: string;
  entityId: ID;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  occurredAt: ISODateTime;
}

/** 地图首页和车型选择页使用的派生展示数据，不作为独立核心实体存库。 */
export interface NearbyVehicleView {
  vehicle: Vehicle;
  model: VehicleModel;
  distanceToUserMeters: DistanceMeter;
  estimatedArrivalMinutes: number;
  recommended: boolean;
  recommendationTags: string[];
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
