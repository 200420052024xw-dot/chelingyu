/** 无人车共享运力平台 - 运行工程统一类型（同步自 data_design/types.ts 并按 04-rules 修订） */

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

export interface ServiceArea extends BaseEntity {
  name: string;
  regionId: ID;
  center: GeoPoint;
  /** 半径（米） */
  radiusMeters: DistanceMeter;
  enabled: boolean;
}

export interface Operator extends BaseEntity {
  name: string;
  level: RegionLevel;
  regionId: ID;
  parentOperatorId?: ID;
  managerUserId: ID;
  status: "pending" | "active" | "suspended" | "terminated";
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
  /** 车主主动开关：是否共享给平台。与平台启用、设备在线分开。 */
  ownerShared: boolean;
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

export interface VehicleReservation extends BaseEntity {
  vehicleId: ID;
  orderId: ID;
  startAt: ISODateTime;
  endAt: ISODateTime;
  status: "scheduled" | "active" | "released" | "cancelled";
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

export interface OrderDraft extends BaseEntity {
  userId: ID;
  revision: number;
  sender?: DeliveryAddressSnapshot;
  receiver?: DeliveryAddressSnapshot;
  serviceTimeMode: ServiceTimeMode;
  scheduledPickupAt?: ISODateTime;
  cargo?: CargoInfo;
  selectedVehicleModelId?: ID;
  dispatchSource?: "nearby" | "headquarters" | "platform";
  headquartersConfirmed?: boolean;
  selectedQuoteId?: ID;
  /** 报价输入摘要，生成报价时锁定。 */
  inputFingerprint?: string;
}

export type OrderType = "task_delivery" | "capacity_reservation";

/** 履约状态 */
export type OrderStatus =
  | "pending_headquarters_review"
  | "pending_dispatch_review"
  | "pending_customer_quote"
  | "pending_payment"
  | "paid"
  | "scheduled"
  | "matching"
  | "dispatched"
  | "vehicle_to_pickup"
  | "awaiting_loading"
  | "delivering"
  | "arrived"
  | "completed"
  | "cancelled"
  | "failed";

/** 支付状态 */
export type PaymentStatus = "pending" | "succeeded" | "failed" | "closed";

/** 退款状态 */
export type RefundStatus = "pending" | "processing" | "succeeded" | "failed";

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
  destinationServiceRegionId?: ID;
  version?: number;
  operatorId?: ID;
  sender: DeliveryAddressSnapshot;
  receiver: DeliveryAddressSnapshot;
  cargo: CargoInfo;
  serviceTimeMode: ServiceTimeMode;
  scheduledPickupAt?: ISODateTime;
  vehicleSnapshot: VehicleCapabilitySnapshot;
  assignedVehicleId?: ID;
  acceptedQuoteId: ID;
  /** 订单锁定的价格明细快照 */
  priceItems: PriceItem[];
  totalAmountFen: MoneyFen;
  /** 锁定的规则版本 */
  pricingPolicyVersion: number;
  pricingPolicyId: ID;
  status: OrderStatus;
  dispatchSource?: "nearby" | "headquarters" | "platform";
  dispatchConfirmed?: boolean;
  dispatchReviewReason?: string;
  dispatchReviewedAt?: ISODateTime;
  dispatchReviewerId?: ID;
  proposedVehicleModelId?: ID;
  proposedTotalAmountFen?: MoneyFen;
  proposedPriceItems?: PriceItem[];
  headquartersConfirmed?: boolean;
  headquartersReviewReason?: string;
  headquartersReviewedAt?: ISODateTime;
  headquartersReviewerId?: ID;
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
  | "discount"
  | "minimum_adjustment";

export interface PriceItem {
  type: PriceItemType;
  label: string;
  amountFen: MoneyFen;
  description?: string;
}

export interface Quote extends BaseEntity {
  orderDraftId: ID;
  draftRevision: number;
  inputFingerprint: string;
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

/** 地图首页车辆展示 DTO（不含车主、设备号等内部信息） */
export interface NearbyVehicleView {
  vehicleId: ID;
  vehicleNo: string;
  modelId: ID;
  modelName: string;
  modelImage: string;
  category: VehicleCategory;
  batteryPercent: Percentage;
  remainingRangeMeters: DistanceMeter;
  maxLoadGrams: WeightGram;
  cargoVolumeLiters: VolumeLiter;
  availableTimeRanges: WeeklyTimeRange[];
  location: GeoPoint;
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

export interface ServiceError {
  code:
    | "VALIDATION_ERROR"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "QUOTE_EXPIRED"
    | "QUOTE_MISMATCH"
    | "NO_CAPACITY"
    | "INVALID_TRANSITION"
    | "CONFLICT"
    | "STORAGE_ERROR"
    | "HANDLING_UNSUPPORTED";
  message: string;
  retryable: boolean;
  fieldErrors?: Array<{ field: string; message: string }>;
}

/* ============================ View Models ============================ */

export interface OrderStatusBadge {
  text: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
}

export interface ModelOfferView {
  modelId: ID;
  modelName: string;
  modelImage: string;
  category: VehicleCategory;
  maxLoadGrams: WeightGram;
  cargoVolumeLiters: VolumeLiter;
  cargoBoxDimensionsMm?: DimensionsMm;
  availableCount: number;
  distanceMeters: DistanceMeter;
  estimatedArrivalMinutes: number;
  batteryPercent?: Percentage;
  recommended: boolean;
  available: boolean;
  unavailableReasons: string[];
  tags: string[];
  supplySource?: "nearby" | "headquarters";
}

export interface OrderSummaryView {
  id: ID;
  orderNo: string;
  status: OrderStatus;
  statusBadge: OrderStatusBadge;
  sender: DeliveryAddressSnapshot;
  receiver: DeliveryAddressSnapshot;
  totalAmountFen: MoneyFen;
  createdAt: ISODateTime;
  vehicleModelName: string;
  vehicleNo?: string;
}

export interface OrderDetailView {
  order: DeliveryOrder;
  events: OrderStatusEvent[];
  payment?: Payment;
  refund?: Refund;
  allowedActions: Array<"pay" | "cancel" | "advance" | "confirm_loaded" | "confirm_received" | "retry_pay" | "accept_quote">;
  assignedVehiclePublic?: NearbyVehicleView;
}

export interface OwnerTaskView {
  orderId: ID;
  orderNo: string;
  status: OrderStatus;
  statusBadge: OrderStatusBadge;
  pickup: DeliveryAddressSnapshot;
  dropoff: DeliveryAddressSnapshot;
  scheduledAt?: ISODateTime;
  estimatedPickupAt?: ISODateTime;
  estimatedDeliveryAt?: ISODateTime;
  vehicleNo: string;
}

export interface EarningsView {
  pendingFen: MoneyFen;
  settledFen: MoneyFen;
  totalFen: MoneyFen;
  items: Array<{
    id: ID;
    orderNo: string;
    vehicleNo: string;
    createdAt: ISODateTime;
    settledAt?: ISODateTime;
    amountFen: MoneyFen;
    status: SettlementStatus;
  }>;
}
