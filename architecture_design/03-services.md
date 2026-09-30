# 服务接口与数据流

本文件约定前端调用方式；所有接口返回 Promise，Mock 与未来远端实现保持同样语义。以下是设计签名，不代表接口已经实现。

## 通用约定

- 查询返回数据副本；列表使用已有 `PaginatedResult<T>`，默认每页 20 条。
- 写命令携带 `requestId`（重复提交返回首次结果）及需要时的 `expectedVersion`（防止覆盖其他修改）。
- 当前用户由会话服务提供，用户不可通过随意传入 `customerId` 或 `ownerId` 访问别人数据。
- 错误统一为 `{ code, message, retryable, fieldErrors? }`。错误码至少包括 `VALIDATION_ERROR`、`FORBIDDEN`、`NOT_FOUND`、`QUOTE_EXPIRED`、`NO_CAPACITY`、`INVALID_TRANSITION`、`CONFLICT`、`STORAGE_ERROR`。
- 调用组件显示忙碌态；阻止连点之外，服务端/Mock 服务也必须实现幂等。

## 模块接口

| 服务 | 方法及输入 | 返回 / 行为 |
|---|---|---|
| session | `getSession()`、`switchDemoIdentity(userId)` | 当前用户和演示身份；切换清理跨用户草稿 |
| region | `listServiceAreas()` | 可演示服务区及关联行政区域 |
| address | `list()`、`save(input)`、`remove(id)` | 当前用户地址，校验默认地址唯一性 |
| fleet | `nearby({areaId, location})` | 附近运力 DTO，不返回车主隐私 |
| fleet | `recommend({draftId, revision})` | 按车型汇总的候选项、可用数量、最近 ETA、适配理由 |
| fleet | `getPublicVehicle(id)` | 允许公开的车辆详情 |
| draft | `create()`、`get(id)`、`update(id, patch)` | 带版本的草稿，变更失效关联报价 |
| pricing | `quote({draftId, revision, modelId})` | 不可变报价、有效期、费用明细 |
| order | `create({draftId, revision, quoteId, requestId})` | 待支付订单；保存快照，服务决定金额 |
| order | `list({filter, page})`、`detail(id)` | 订单 DTO、支付/退款摘要、事件、允许操作列表 |
| payment | `payMock({orderId, requestId, scenario})` | 模拟成功/失败；金额从订单读取 |
| order | `cancel({orderId, reason, expectedVersion, requestId})` | 取消订单，按支付状态创建退款 |
| order | `confirmLoaded(command)`、`confirmReceived(command)` | 校验归属、版本和状态后推进履约 |
| simulation | `advance({orderId, event, requestId})` | 显式模拟车辆到达、退款回调等；仅 Mock 模式注册 |
| owner | `listVehicles()`、`vehicleDetail(id)` | 本车主车辆与状态 |
| owner | `bindDemoVehicle({vehicleId, requestId})` | 仅未绑定演示车辆可绑定 |
| owner | `saveAvailability({vehicleId, rule, expectedVersion})` | 校验时段及已承诺任务冲突 |
| owner | `tasks({vehicleId, page})`、`earnings({range, vehicleId?})` | 脱敏任务 DTO、按分润流水聚合的收益 |
| notification | `list({page})`、`markRead(id)` | 当前用户消息 |
| support | `create(input)`、`list()`、`detail(id)` | 当前用户工单 |

`command` 统一包含 `orderId`、`expectedVersion`、`requestId`。模拟失败场景参数仅在 Mock 实现提供，真实接口不接受用户指定支付结果。

## 关键 DTO 补充

- `SessionView`：用户公开资料、演示模式、允许的入口。
- `ServiceArea`：`id`、名称、行政 `regionId`、中心点、可选边界、是否启用。校区是服务区，不能当作行政区。
- `DraftRecord`：`id`、用户归属、`revision`、现有 `OrderDraft` 内容和更新时间。
- `ModelOfferView`：型号、可用数量、预计到达、是否适配、不能使用的原因。具体车辆由调度选定。
- `OrderDetailView`：订单、事件、支付摘要、退款摘要、车辆公开位置、`allowedActions`。
- `OwnerTaskView`：订单编号、任务状态、车辆、取送点与时间，不直接透出完整订单实体。
- `EarningsView`：币种、统计区间、待结算/已结算金额、分润明细；无独立可手改的收益总额。

这些 DTO 在创建工程时补入契约文件；当前 `NearbyVehicleView` 包含完整 Vehicle，不宜直接作为真实公共 API 返回体。

## 下单事务

1. 修改地址/时间/货物/车型使草稿版本递增，清空旧 `quoteId`。
2. 计价服务校验服务范围、货物和车型，生成与草稿版本及输入摘要绑定的报价。
3. 创建订单再次校验报价归属、输入摘要、有效期，服务保存地址和价格快照。
4. 支付成功一次性记录支付与 `paid` 事件；即时订单进入匹配，预约订单写入运力预留。
5. 匹配服务检查车辆状态、电量、能力、运营窗口和预约冲突，成功后同时修改车辆占用与订单归属并写事件。
6. 无可用车辆时结束匹配、标记失败原因并创建全额模拟退款；不留下“已付款但永远匹配中”的订单。

报价不锁车。待支付订单不占用车辆；支付后需要重新确认容量。当前单设备 Mock 用串行写队列实现竞争处理；未来后端须用事务/条件更新保证同一时间段的车辆不会重复分配。

## 迁移真实接口

将上面的命令映射为 HTTP 资源与动作即可，例如 `GET /orders`、`POST /orders`、`POST /orders/{id}/cancel`。页面只调用服务，不拼接 URL。微信支付改为“后端创建支付单 → 客户端拉起支付 → 后端确认回调 → 页面查询状态”，客户端支付提示不作为到账依据。
