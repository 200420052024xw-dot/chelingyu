# 无人车共享运力平台数据设计

本目录是微信小程序原型阶段的数据契约。当前使用本地 Mock 数据时也应遵守这些类型，后续接入 CloudBase、独立后端或其他托管平台时，页面无需重新定义数据结构。

## 文件说明

- `types.ts`：全系统 TypeScript 领域类型，是前后端数据结构的唯一基准。
- `mock-data.ts`：与当前原型图一致的示例数据，可直接用于页面开发。
- `database-schema.md`：未来数据库集合/表、关联关系和索引建议。

## 建模范围

数据模型覆盖以下业务模块：

1. 用户、角色与常用地址
2. 省、市、区区域和分级运营商
3. 车辆型号、车辆资产、开放时段、实时状态和维护记录
4. 货物、即时配送、预约运力和统一调度
5. 报价、价格规则、支付与退款
6. 平台、运营商和车主收益结算
7. 消息、客服工单和操作审计

原型首期主要使用用户、地址、车辆型号、车辆、货物、报价、订单和订单轨迹。其余类型先作为边界定义，不要求首期全部实现页面。

## 统一数据规范

| 数据 | 统一格式 | 示例 |
|---|---|---|
| ID | 不透明字符串，不从中解析业务含义 | `veh_001` |
| 日期时间 | ISO 8601，带时区 | `2026-09-21T09:30:00+08:00` |
| 金额 | 整数，单位为分 | `760` 表示 ¥7.60 |
| 距离、续航 | 整数，单位为米 | `35000` 表示 35km |
| 重量 | 整数，单位为克 | `100000` 表示 100kg |
| 尺寸 | 整数，单位为毫米 | `300` 表示 300mm |
| 容积 | 整数，单位为升 | `1200` 表示 1.2m³ |
| 电量 | 0～100 的整数百分比 | `78` |
| 经纬度 | 十进制度数 | `115.8582, 28.6829` |
| 状态/类型 | 固定英文枚举值 | `available` |
| 可选值 | 未填写时省略字段，不使用空字符串冒充 | — |

金额、重量和距离使用整数，避免浮点误差；页面负责转换成元、千克和千米进行展示。

## 核心关系

```text
Region 1 ── N Operator
User   1 ── N Address
User   1 ── 0..1 VehicleOwner
VehicleOwner 1 ── N Vehicle
VehicleModel 1 ── N Vehicle
Vehicle 1 ── N AvailabilityRule / Telemetry / MaintenanceRecord

User 1 ── N DeliveryOrder
DeliveryOrder 1 ── 1 CargoInfo
DeliveryOrder 1 ── N Quote
DeliveryOrder 1 ── N DispatchRecord
DeliveryOrder 1 ── N OrderStatusEvent
DeliveryOrder 1 ── 0..N Payment / Refund / RevenueAllocation
```

## 订单主状态机

```text
draft
  → quoted
  → pending_payment
  → paid
  → matching
  → dispatched
  → vehicle_to_pickup
  → awaiting_loading
  → delivering
  → arrived
  → completed
```

业务异常可以进入 `cancelled` 或 `failed`；支付后的取消依次进入 `refunding`、`refunded`。每次变化都要新增 `OrderStatusEvent`，不能只覆盖订单当前状态。

## 需要保存与实时计算的边界

必须保存：

- 下单时的寄件、收件地址快照和联系人快照
- 下单时的货物信息、车辆参数快照和最终报价
- 订单、支付、退款、分润和状态变更记录
- 车辆所有权、开放时段、维护和关键异常记录
- 价格规则版本及其生效时间

实时计算或短期缓存：

- 车辆距离当前用户多少米
- 预计几分钟到达
- 地图视野内可用车辆数量
- 推荐车型排序和推荐理由
- 实时车辆位置、速度与剩余续航

实时值可以生成快照用于订单举证，但不应把每次页面刷新结果当作核心业务数据永久保存。

## 原型阶段约定

- 前端通过 `services` 层读取 `mock-data.ts`，页面不要直接引用 Mock 常量。
- 创建订单前使用 `OrderDraft` 保存多步骤表单，确认支付后再生成正式 `DeliveryOrder`。
- 原型支付、调度、车辆移动均可模拟，但仍需按正式状态机变更数据。
- 车辆列表展示的是具体车辆；“车型”只是车辆能力模板，二者不能合成一张表。
- 用户修改常用地址不影响历史订单，因为订单保存独立地址快照。

