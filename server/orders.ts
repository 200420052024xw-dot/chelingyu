import type { CargoInfo, DeliveryAddressSnapshot, DeliveryOrder, OrderDraft, OrderStatus, Quote, Vehicle, VehicleAvailabilityRule, VehicleModel } from "../miniprogram/contracts/types";
import { computeInputFingerprint } from "../miniprogram/domain/pricing";
import { addEvent, areaFor, audit, canOperateOrder, distanceMeters, fail, getOrder, id, notify, now, priceFor, type AdminAccount, type SharedState } from "./state";
import { quoteFor } from "./pricing";

export interface CreateInput { draft: OrderDraft; quote: Quote; requestId: string; }
const terminal = new Set<OrderStatus>(["completed", "cancelled", "failed"]);
const customerCancelable = new Set<OrderStatus>(["pending_dispatch_review", "pending_customer_quote", "pending_payment", "paid", "scheduled", "matching", "dispatched", "vehicle_to_pickup"]);

function compatible(model: VehicleModel, cargo: CargoInfo): boolean {
  if (!model.enabled || !model.supportedCargoCategories.includes(cargo.category)) return false;
  if (cargo.category === "fresh_cold_chain" && !model.supportsColdChain) return false;
  if ((cargo.unitWeightGrams || 0) * cargo.quantity > model.maxLoadGrams) return false;
  const size = cargo.unitDimensionsMm;
  const box = model.cargoBoxDimensionsMm;
  return !size || !box || (size.length <= box.length && size.width <= box.width && size.height <= box.height);
}
function localTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date);
  const get = (name: string) => parts.find(p => p.type === name)?.value || "";
  const weekday = (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1) as 1|2|3|4|5|6|7;
  return { weekday, time: `${get("hour").padStart(2, "0")}:${get("minute")}` };
}
function openAt(rule: VehicleAvailabilityRule | undefined, at: Date): boolean {
  if (!rule?.enabled) return false;
  const local = localTime(at);
  return rule.ranges.some(range => range.weekdays.includes(local.weekday) && range.startTime <= local.time && local.time < range.endTime);
}
function conflict(state: SharedState, vehicleId: string, start: number, end: number): boolean {
  return state.reservations.some(r => r.vehicleId === vehicleId && r.status !== "cancelled" && r.status !== "released" && start < Date.parse(r.endAt) && end > Date.parse(r.startAt));
}
function windowFor(order: DeliveryOrder) {
  const start = order.scheduledPickupAt ? Date.parse(order.scheduledPickupAt) : Date.now();
  return { start, end: start + 90 * 60_000 };
}
export function eligibleVehicles(state: SharedState, order: DeliveryOrder): Vehicle[] {
  const { start, end } = windowFor(order);
  return state.vehicles.filter(v => {
    if (!v.enabled || !v.ownerShared || v.batteryPercent === undefined || v.batteryPercent < 20) return false;
    if (v.modelId !== order.vehicleSnapshot.vehicleModelId) return false;
    if (v.status !== "available" && !(order.serviceTimeMode === "scheduled" && v.status === "reserved")) return false;
    const area = state.areas.find(a => a.id === v.serviceRegionId);
    const pickup = state.areas.find(a => a.id === order.serviceRegionId);
    if (!area || !pickup || area.cityId !== pickup.cityId) return false;
    const model = state.models.find(m => m.id === v.modelId);
    if (!model || !compatible(model, order.cargo)) return false;
    const rule = state.availability.find(r => r.vehicleId === v.id);
    if (!openAt(rule, new Date(start)) || !openAt(rule, new Date(end - 60_000))) return false;
    return !conflict(state, v.id, start, end);
  }).sort((a,b) => distanceMeters(a.location || order.sender.location, order.sender.location) - distanceMeters(b.location || order.sender.location, order.sender.location));
}
function releaseVehicle(state: SharedState, order: DeliveryOrder) {
  if (!order.assignedVehicleId) return;
  const vehicle = state.vehicles.find(v => v.id === order.assignedVehicleId);
  if (vehicle && vehicle.currentOrderId === order.id) { vehicle.currentOrderId = undefined; vehicle.status = "available"; vehicle.updatedAt = now(); }
  for (const reservation of state.reservations) if (reservation.orderId === order.id && reservation.status !== "released") { reservation.status = "released"; reservation.updatedAt = now(); }
}
function requireInterventionReason(state: SharedState, admin: AdminAccount, order: DeliveryOrder, note: string) {
  const pickupRegion = state.areas.find(a => a.id === order.serviceRegionId)?.regionId;
  if (admin.level !== "district" || admin.regionId !== pickupRegion) {
    if (!note.trim()) fail(400, "REASON_REQUIRED", "上级介入此订单时必须填写处理原因");
  }
}
function refund(state: SharedState, order: DeliveryOrder, reason: string) {
  const payment = state.payments.find(p => p.orderId === order.id && p.status === "succeeded");
  if (!payment || state.refunds.some(r => r.orderId === order.id)) return;
  const timestamp = now();
  state.refunds.push({ id: id("refund"), refundNo: id("R"), orderId: order.id, paymentId: payment.id, amountFen: payment.amountFen, reason, status: "succeeded", completedAt: timestamp, createdAt: timestamp, updatedAt: timestamp });
}
function assign(state: SharedState, order: DeliveryOrder, vehicle: Vehicle, actorId: string) {
  if (!eligibleVehicles(state, order).some(v => v.id === vehicle.id)) fail(409, "NO_CAPACITY", "车辆当前不符合调度条件或时段已被占用");
  const { start, end } = windowFor(order);
  const timestamp = now();
  state.reservations.push({ id: id("reservation"), vehicleId: vehicle.id, orderId: order.id, startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString(), status: order.serviceTimeMode === "scheduled" ? "scheduled" : "active", createdAt: timestamp, updatedAt: timestamp });
  if (order.serviceTimeMode !== "scheduled") { vehicle.status = "reserved"; vehicle.currentOrderId = order.id; vehicle.updatedAt = timestamp; }
  order.assignedVehicleId = vehicle.id;
  order.vehicleSnapshot = { ...order.vehicleSnapshot, vehicleId: vehicle.id, vehicleNo: vehicle.vehicleNo, batteryPercent: vehicle.batteryPercent };
  order.estimatedPickupAt = new Date(order.serviceTimeMode === "scheduled" ? start : start + 10 * 60_000).toISOString();
  order.estimatedDeliveryAt = new Date(end).toISOString();
  addEvent(state, order, "dispatched", actorId === "system" ? "system" : "operator", actorId, `已分配车辆 ${vehicle.vehicleNo}`);
  notify(state, order, "车辆已安排");
  return order;
}
export function createOrder(state: SharedState, userId: string, input: CreateInput): DeliveryOrder {
  if (!input.requestId) fail(400, "VALIDATION_ERROR", "缺少请求编号");
  const requestKey = `${userId}:create:${input.requestId}`;
  if (state.requests[requestKey]) return getOrder(state, state.requests[requestKey]);
  const { draft, quote } = input;
  if (!draft?.sender || !draft.receiver || !draft.cargo || !draft.selectedVehicleModelId || !quote) fail(400, "VALIDATION_ERROR", "订单资料不完整");
  const sender = draft.sender!, receiver = draft.receiver!, cargo = draft.cargo!;
  // The authenticated session owns the new order; local draft IDs are device-scoped hints.
  if (quote.vehicleModelId !== draft.selectedVehicleModelId || quote.draftRevision !== draft.revision || quote.inputFingerprint !== computeInputFingerprint(draft,draft.selectedVehicleModelId) || Date.parse(quote.expiresAt) <= Date.now()) fail(409, "QUOTE_EXPIRED", "报价已过期，请重新选择车型");
  const pickup = areaFor(state, sender);
  const destination = areaFor(state, receiver);
  if (pickup.cityId !== destination.cityId) fail(400, "OUT_OF_SERVICE", "目前仅支持同城跨区配送");
  const model = state.models.find(m => m.id === draft.selectedVehicleModelId) || fail(404, "NOT_FOUND", "车型不存在");
  if (draft.serviceTimeMode === "scheduled" && (!draft.scheduledPickupAt || Date.parse(draft.scheduledPickupAt) <= Date.now())) fail(400, "VALIDATION_ERROR", "预约时间需晚于当前时间");
  const pricing = quoteFor(state, sender, receiver, cargo, model, quote.routeDistanceMeters>0||quote.routeDistanceSource==="tencent"?quote.routeDistanceMeters:undefined);
  if (quote.pricingPolicyVersion !== pricing.policyVersion) fail(409, "QUOTE_CHANGED", "价格规则已更新，请重新确认报价");
  if (quote.routeReviewRequired) {
    if (quote.totalAmountFen!==0||quote.items.length!==0) fail(409,"QUOTE_CHANGED","路线待核实需求不得预先收费");
  } else if (quote.totalAmountFen !== pricing.total || JSON.stringify(quote.items) !== JSON.stringify(pricing.items)) fail(409,"QUOTE_CHANGED","订单价格已变更，请重新选择车型并确认报价");
  const manual = !!quote.routeReviewRequired || draft.serviceTimeMode === "scheduled" || draft.dispatchSource === "headquarters" || draft.dispatchSource === "platform" || !compatible(model, cargo);
  const timestamp = now();
  const order: DeliveryOrder = {
    id: id("order"), orderNo: `CLY${Date.now()}${Math.floor(Math.random()*900+100)}`, type: "task_delivery", customerId: userId,
    serviceRegionId: pickup.id, destinationServiceRegionId: destination.id, sender, receiver,
    cargo, serviceTimeMode: draft.serviceTimeMode, scheduledPickupAt: draft.scheduledPickupAt,
    vehicleSnapshot: { vehicleModelId: model.id, modelName: model.name, imageUrl: model.imageUrl, maxLoadGrams: model.maxLoadGrams, cargoVolumeLiters: model.cargoVolumeLiters },
    acceptedQuoteId: quote.id, priceItems:quote.routeReviewRequired?[]:pricing.items, totalAmountFen:quote.routeReviewRequired?0:pricing.total, pricingPolicyId: pricing.policyId, pricingPolicyVersion: pricing.policyVersion,
    routeDistanceMeters:quote.routeDistanceSource==="tencent"?quote.routeDistanceMeters:quote.routeDistanceMeters||undefined,routeDistanceSource:quote.routeReviewRequired?undefined:quote.routeDistanceSource||"demo",
    routeReviewRequired:quote.routeReviewRequired||undefined,
    status: manual ? "pending_dispatch_review" : "pending_payment", dispatchSource: manual ? "platform" : "nearby", version: 1, createdAt: timestamp, updatedAt: timestamp,
  };
  state.orders.push(order);
  state.events.push({ id: id("event"), orderId: order.id, toStatus: order.status, actorType: "customer", actorId: userId, occurredAt: timestamp, note: "用户提交订单", createdAt: timestamp, updatedAt: timestamp });
  state.requests[requestKey] = order.id;
  if (manual) notify(state, order, quote.routeReviewRequired?"新需求待核实路线":"新订单待调度确认");
  return order;
}
export function review(state: SharedState, admin: AdminAccount, orderId: string, decision: "approved" | "rejected", reason = "", replacementModelId?: string, manualDistanceMeters?: number, routeEvidence = "") {
  const order = getOrder(state, orderId);
  if (!canOperateOrder(state, admin, order)) fail(403, "FORBIDDEN", "无权处理该区域订单");
  requireInterventionReason(state,admin,order,reason);
  if (order.status !== "pending_dispatch_review") fail(409, "INVALID_TRANSITION", "当前订单无需审核");
  if(order.routeReviewRequired && (admin.level!=="district"||state.areas.find(area=>area.id===order.serviceRegionId)?.regionId!==admin.regionId)) fail(403,"FORBIDDEN","路线人工核实必须由取货区处理");
  if (decision === "rejected") {
    if (!reason.trim()) fail(400, "VALIDATION_ERROR", "请填写拒绝原因");
    order.dispatchReviewReason = reason.trim();
    addEvent(state, order, "failed", "operator", admin.id, reason.trim());
    audit(state, order, admin, "reject", reason.trim());
    notify(state, order, "订单未通过调度确认");
    return order;
  }
  const model = state.models.find(m => m.id === (replacementModelId || order.vehicleSnapshot.vehicleModelId)) || fail(404, "NOT_FOUND", "车型不存在");
  if (!compatible(model, order.cargo)) fail(400, "INCOMPATIBLE_MODEL", "车型无法承运该货物，请更换车型或拒绝");
  if(order.routeReviewRequired){
    if(!Number.isInteger(manualDistanceMeters)||!manualDistanceMeters||manualDistanceMeters<=0||manualDistanceMeters>1_000_000||!routeEvidence.trim()||routeEvidence.trim().length>500||!reason.trim()||reason.trim().length>500) fail(400,"VALIDATION_ERROR","请填写有效的审核理由、计费路线里程和通行依据（说明不超过500字）");
    const pricing=quoteFor(state,order.sender,order.receiver,order.cargo,model,manualDistanceMeters);
    order.dispatchConfirmed=true;order.dispatchReviewerId=admin.id;order.dispatchReviewedAt=now();order.dispatchReviewReason=reason.trim();
    order.pricingPolicyId=pricing.policyId;order.pricingPolicyVersion=pricing.policyVersion;
    order.proposedVehicleModelId=model.id;
    order.proposedPriceItems=pricing.items;order.proposedTotalAmountFen=pricing.total;
    order.proposedRouteDistanceMeters=manualDistanceMeters;order.routeReviewEvidence=routeEvidence.trim();
    addEvent(state,order,"pending_customer_quote","operator",admin.id,"路线已人工核实，等待客户确认计费里程与新报价");
    audit(state,order,admin,"route_approved",`${reason.trim()}；计费里程 ${manualDistanceMeters} 米；依据：${routeEvidence.trim()}`);
    notify(state,order,"路线已核实，请确认报价后支付");
    return order;
  }
  order.dispatchConfirmed = true; order.dispatchReviewerId = admin.id; order.dispatchReviewedAt = now(); order.dispatchReviewReason = reason.trim() || undefined;
  if (model.id !== order.vehicleSnapshot.vehicleModelId) {
    const pricing = quoteFor(state, order.sender, order.receiver, order.cargo, model, order.routeDistanceMeters);
    order.pricingPolicyId=pricing.policyId;order.pricingPolicyVersion=pricing.policyVersion;
    order.proposedVehicleModelId = model.id; order.proposedPriceItems = pricing.items; order.proposedTotalAmountFen = pricing.total;
    addEvent(state, order, "pending_customer_quote", "operator", admin.id, "建议更换车型，等待客户确认新报价");
  } else addEvent(state, order, "pending_payment", "operator", admin.id, "平台调度确认通过");
  audit(state, order, admin, "approve", reason.trim() || model.name);
  notify(state, order, model.id !== order.vehicleSnapshot.vehicleModelId ? "请确认新车型与报价" : "订单审核通过，请支付");
  return order;
}
export function acceptQuote(state: SharedState, userId: string, orderId: string) {
  const order = getOrder(state, orderId);
  if (order.customerId !== userId) fail(403, "FORBIDDEN", "无权操作此订单");
  if (order.status !== "pending_customer_quote" || !order.proposedVehicleModelId || !order.proposedPriceItems || order.proposedTotalAmountFen === undefined) fail(409, "INVALID_TRANSITION", "当前没有待确认报价");
  const model = state.models.find(m => m.id === order.proposedVehicleModelId) || fail(404, "NOT_FOUND", "车型不存在");
  order.vehicleSnapshot = { vehicleModelId: model.id, modelName: model.name, imageUrl: model.imageUrl, maxLoadGrams: model.maxLoadGrams, cargoVolumeLiters: model.cargoVolumeLiters };
  order.priceItems = order.proposedPriceItems!; order.totalAmountFen = order.proposedTotalAmountFen!;
  if(order.proposedRouteDistanceMeters!==undefined){order.routeDistanceMeters=order.proposedRouteDistanceMeters;order.routeDistanceSource="manual";order.routeReviewRequired=false;order.proposedRouteDistanceMeters=undefined;}
  order.proposedVehicleModelId = undefined; order.proposedPriceItems = undefined; order.proposedTotalAmountFen = undefined;
  addEvent(state, order, "pending_payment", "customer", userId, "客户接受新报价");
  return order;
}
export function payMock(state: SharedState, userId: string, orderId: string, requestId: string, scenario: "success" | "fail") {
  const order = getOrder(state, orderId);
  if (order.customerId !== userId) fail(403, "FORBIDDEN", "无权支付此订单");
  if (!requestId) fail(400, "VALIDATION_ERROR", "缺少请求编号");
  const existing = state.payments.find(p => p.orderId === orderId && p.status === "succeeded");
  if (existing) return { order, payment: existing };
  if (order.status !== "pending_payment") fail(409, "INVALID_TRANSITION", "当前订单不能支付");
  const key = `${userId}:pay:${requestId}`;
  if (state.requests[key]) return { order, payment: state.payments.find(p => p.id === state.requests[key]) };
  if (scenario === "success" && eligibleVehicles(state,order).length < 1) fail(409,"NO_CAPACITY","同城暂无符合条件的车辆，请稍后再试，尚未扣款");
  const timestamp = now();
  const payment = { id: id("payment"), paymentNo: id("P"), orderId, payerUserId: userId, channel: "mock" as const, amountFen: order.totalAmountFen, status: scenario === "success" ? "succeeded" as const : "failed" as const, paidAt: scenario === "success" ? timestamp : undefined, createdAt: timestamp, updatedAt: timestamp };
  state.payments.push(payment); state.requests[key] = payment.id;
  if (scenario === "success") {
    addEvent(state, order, "paid", "customer", userId, "模拟支付成功");
    if (order.serviceTimeMode === "scheduled") addEvent(state, order, "scheduled", "system", "system", "预约订单等待派车");
    else if (order.dispatchSource === "nearby") {
      addEvent(state, order, "matching", "system", "system", "自动匹配车辆");
      const vehicle = eligibleVehicles(state, order)[0];
      if (vehicle) assign(state, order, vehicle, "system");
      else { addEvent(state, order, "failed", "system", "system", "暂无可用车辆"); refund(state, order, "无可用车辆，全额模拟退款"); }
    } else { addEvent(state, order, "matching", "system", "system", "等待区域运营派车"); notify(state, order, "已支付订单待派车"); }
  }
  return { order, payment };
}
export function dispatch(state: SharedState, admin: AdminAccount, orderId: string, vehicleId: string, note = "") {
  const order = getOrder(state, orderId);
  if (!canOperateOrder(state, admin, order)) fail(403, "FORBIDDEN", "无权派车");
  requireInterventionReason(state,admin,order,note);
  if (!["scheduled", "matching", "paid"].includes(order.status)) fail(409, "INVALID_TRANSITION", "当前订单不能派车");
  const vehicle = state.vehicles.find(v => v.id === vehicleId) || fail(404, "NOT_FOUND", "车辆不存在");
  assign(state, order, vehicle, admin.id);
  audit(state, order, admin, "dispatch", `${vehicle.vehicleNo} ${note}`.trim());
  return order;
}
export function progress(state: SharedState, admin: AdminAccount, orderId: string, toStatus: "vehicle_to_pickup" | "awaiting_loading" | "arrived", note = "") {
  const order = getOrder(state, orderId);
  if (!canOperateOrder(state, admin, order)) fail(403, "FORBIDDEN", "无权更新此订单");
  requireInterventionReason(state,admin,order,note);
  const allowed: Record<string, string> = { dispatched: "vehicle_to_pickup", vehicle_to_pickup: "awaiting_loading", delivering: "arrived" };
  if (allowed[order.status] !== toStatus) fail(409, "INVALID_TRANSITION", "订单状态不允许该操作");
  if (order.serviceTimeMode === "scheduled" && toStatus === "vehicle_to_pickup" && order.scheduledPickupAt && Date.parse(order.scheduledPickupAt) > Date.now() + 30 * 60_000) fail(409,"TOO_EARLY","预约取件时间尚未临近，请在预约前30分钟内启程");
  addEvent(state, order, toStatus, "operator", admin.id, note.trim() || "区域运营更新配送进度");
  const vehicle = state.vehicles.find(v => v.id === order.assignedVehicleId);
  if (vehicle) { vehicle.status = toStatus === "arrived" ? "delivering" : toStatus; vehicle.currentOrderId = order.id; vehicle.updatedAt = now(); }
  audit(state, order, admin, toStatus, note.trim());
  notify(state, order, toStatus === "awaiting_loading" ? "车辆已到达取件点，请确认装货" : toStatus === "arrived" ? "车辆已送达，请确认收货" : "车辆正在前往取件点");
  return order;
}
export function customerConfirm(state: SharedState, userId: string, orderId: string, kind: "loaded" | "received") {
  const order = getOrder(state, orderId);
  if (order.customerId !== userId) fail(403, "FORBIDDEN", "无权操作此订单");
  const expected = kind === "loaded" ? "awaiting_loading" : "arrived";
  if (order.status !== expected) fail(409, "INVALID_TRANSITION", "当前不能进行此确认");
  addEvent(state, order, kind === "loaded" ? "delivering" : "completed", "customer", userId, kind === "loaded" ? "客户确认装货" : "客户确认收货");
  const vehicle = state.vehicles.find(v => v.id === order.assignedVehicleId);
  if (vehicle && kind === "loaded") { vehicle.status = "delivering"; vehicle.updatedAt = now(); }
  if (kind === "received") releaseVehicle(state, order);
  notify(state, order, kind === "loaded" ? "客户已确认装货" : "订单已完成");
  return order;
}
export function cancel(state: SharedState, userId: string, orderId: string, reason: string) {
  const order = getOrder(state, orderId);
  if (order.customerId !== userId) fail(403, "FORBIDDEN", "无权取消此订单");
  if (!customerCancelable.has(order.status)) fail(409, "INVALID_TRANSITION", "当前订单不可取消，请联系客服");
  order.cancellationReason = reason.trim() || "客户取消";
  addEvent(state, order, "cancelled", "customer", userId, order.cancellationReason);
  releaseVehicle(state, order); refund(state, order, order.cancellationReason);
  notify(state, order, "客户取消订单");
  return order;
}
export function markException(state: SharedState, admin: AdminAccount, orderId: string, reason: string) {
  const order = getOrder(state, orderId);
  if (!canOperateOrder(state, admin, order)) fail(403, "FORBIDDEN", "无权处理此订单");
  if (terminal.has(order.status) || !reason.trim()) fail(400, "VALIDATION_ERROR", "请填写有效的异常原因");
  order.dispatchReviewReason = reason.trim();
  addEvent(state, order, "failed", "operator", admin.id, reason.trim());
  releaseVehicle(state, order); refund(state, order, reason.trim());
  audit(state, order, admin, "exception", reason.trim());
  notify(state, order, "订单异常结束");
  return order;
}
export function orderDetail(state: SharedState, order: DeliveryOrder) {
  const vehicle = state.vehicles.find(v => v.id === order.assignedVehicleId);
  const model = state.models.find(m => m.id === order.vehicleSnapshot.vehicleModelId);
  const allowedActions: string[] = [];
  if (order.status === "pending_customer_quote") allowedActions.push("accept_quote");
  if (order.status === "pending_payment") allowedActions.push("pay");
  if (customerCancelable.has(order.status)) allowedActions.push("cancel");
  if (order.status === "awaiting_loading") allowedActions.push("confirm_loaded");
  if (order.status === "arrived") allowedActions.push("confirm_received");
  return {
    order, events: state.events.filter(e => e.orderId === order.id),
    payment: [...state.payments].reverse().find(p => p.orderId === order.id),
    refund: state.refunds.find(r => r.orderId === order.id), allowedActions,
    assignedVehiclePublic: vehicle && model ? { vehicleId: vehicle.id, vehicleNo: vehicle.vehicleNo, modelId: model.id, modelName: model.name, modelImage: model.imageUrl, batteryPercent: vehicle.batteryPercent || 0, remainingRangeMeters: vehicle.remainingRangeMeters || 0, location: vehicle.location || order.sender.location } : undefined,
  };
}
