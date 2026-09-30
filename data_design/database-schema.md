# 数据库结构建议

当前原型不需要真实数据库，但本地 Mock 数据按以下集合/表拆分。正式后端可以使用关系型数据库；若先采用云数据库，也保持相同实体边界。

## 核心集合/表

| 名称 | 对应类型 | 主要关联 |
|---|---|---|
| `users` | `User` | 用户主体 |
| `addresses` | `Address` | `userId → users.id` |
| `regions` | `Region` | `parentId → regions.id` |
| `operators` | `Operator` | 区域、上级运营商、管理员用户 |
| `operator_memberships` | `OperatorMembership` | 运营商成员及岗位权限 |
| `vehicle_owners` | `VehicleOwner` | `userId → users.id` |
| `vehicle_models` | `VehicleModel` | 车辆能力模板 |
| `vehicles` | `Vehicle` | 型号、车主、运营商、区域、当前订单 |
| `vehicle_availability_rules` | `VehicleAvailabilityRule` | `vehicleId → vehicles.id` |
| `vehicle_telemetry_latest` | `VehicleTelemetrySnapshot` | 每车仅保留最新快照供原型查询 |
| `vehicle_maintenance_records` | `VehicleMaintenanceRecord` | `vehicleId → vehicles.id` |
| `orders` | `DeliveryOrder` | 用户、区域、车辆、报价 |
| `quotes` | `Quote` | 用户、车型/车辆、价格规则 |
| `pricing_policies` | `PricingPolicy` | 区域、运营商、上级规则 |
| `dispatch_records` | `DispatchRecord` | 订单候选车与最终匹配 |
| `order_status_events` | `OrderStatusEvent` | 订单完整履约轨迹 |
| `capacity_reservations` | `CapacityReservation` | 企业周期预约 |
| `payments` | `Payment` | 订单支付 |
| `refunds` | `Refund` | 支付退款 |
| `revenue_sharing_rules` | `RevenueSharingRule` | 分润比例及生效版本 |
| `revenue_allocations` | `RevenueAllocation` | 单笔订单各参与方分润 |
| `settlement_accounts` | `SettlementAccount` | 运营商、车主收款账户 |
| `notifications` | `Notification` | 用户消息 |
| `support_tickets` | `SupportTicket` | 客服与异常处理 |
| `audit_logs` | `AuditLog` | 价格、权限、车辆等敏感操作审计 |

## 建议唯一约束

- `users.openId`：有值时唯一
- `regions.code`：唯一
- `vehicle_models.code`：唯一
- `vehicles.vehicleNo`：唯一
- `vehicles.deviceId`：有值时唯一
- `orders.orderNo`：唯一
- `payments.paymentNo`：唯一
- `refunds.refundNo`：唯一
- `support_tickets.ticketNo`：唯一

## 原型期必要索引

- `addresses(userId, updatedAt)`
- `operator_memberships(operatorId, userId)`，并对二者组合设置唯一约束
- `vehicles(serviceRegionId, status, enabled)`
- `vehicles(ownerId, updatedAt)`
- `orders(customerId, createdAt)`
- `orders(assignedVehicleId, status)`
- `orders(serviceRegionId, status, createdAt)`
- `order_status_events(orderId, occurredAt)`
- `quotes(customerId, expiresAt)`
- `notifications(userId, readAt, createdAt)`

车辆附近查询如果尚未连接真实后端，可直接遍历少量 Mock 数据计算。进入真实运营阶段后再使用数据库地理空间索引，不需要在原型期建设复杂调度基础设施。

## 快照与关联原则

订单既保留关联 ID，也保留下单时快照：

- 地址保存 `DeliveryAddressSnapshot`
- 车辆保存 `VehicleCapabilitySnapshot`
- 报价保存费用项、总额和价格规则版本

这样即使用户修改地址、车辆型号参数或运营商调整价格，历史订单仍能还原当时事实。

## 权限边界

- 普通用户只能访问自己的地址、订单、支付和消息。
- 车主只能访问自己名下车辆、车辆任务及对应收益，不能修改订单价格。
- 区级运营商只能访问本区；市级可访问下辖区；省级可访问下辖城市；平台管理员可访问全局。
- 价格政策修改、运营商层级变更、车辆所有权变更和人工订单处理必须写入 `audit_logs`。
- 前端传入的角色、价格、订单归属都不可信，正式后端必须重新鉴权和计算。
