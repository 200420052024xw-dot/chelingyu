# 页面、角色与导航

路径相对于计划中的 `miniprogram/`，页面统一以 `/index` 结尾。三个底部入口保留原型中的“首页 / 订单 / 我的”。

| 路径 | 页面 | 内容 / 操作 |
|---|---|---|
| `pages/home/index` | 首页 | 地图、附近车辆、预计到达、车辆抽屉、区域选择、我要用车 |
| `pages/orders/index` | 订单列表 | 全部、待支付、进行中、已完成、已取消；刷新和分页 |
| `pages/profile/index` | 我的 | 用户、地址、我的车辆、收益、消息、客服、设置 |
| `packages/delivery/pages/address-step/index` | 下单第一步 | 寄收件地址、联系人、即时/预约取件 |
| `packages/delivery/pages/cargo-step/index` | 下单第二步 | 类别、件数、单件重量尺寸、易碎、特殊要求 |
| `packages/delivery/pages/model-step/index` | 下单第三步 | 推荐/最近/全部车型、适配性、费用预估 |
| `packages/delivery/pages/confirm/index` | 确认订单 | 地址、货物、车型和有效报价，确认并模拟支付 |
| `packages/delivery/pages/detail/index` | 订单详情 | 状态时间线、路线、车辆、费用、支付、取消、确认装货/收货 |
| `packages/delivery/pages/addresses/index` | 常用地址 | 选择、新建、编辑、删除、默认地址 |
| `packages/delivery/pages/address-edit/index` | 地址编辑 | 地图选点、地址详情、姓名、电话 |
| `packages/owner/pages/vehicles/index` | 我的车辆 | 名下车辆、状态、接入状态、绑定入口 |
| `packages/owner/pages/bind/index` | 绑定演示 | 从未绑定演示资产池选择，验证并绑定 |
| `packages/owner/pages/vehicle-detail/index` | 车辆详情 | 电量、位置、型号、开放时段、当前任务、历史任务 |
| `packages/owner/pages/availability/index` | 运营设置 | 是否共享、每周开放时段、规则生效日期 |
| `packages/owner/pages/tasks/index` | 车辆任务 | 当前与历史任务，仅显示履约所需信息 |
| `packages/owner/pages/earnings/index` | 收益 | 待结算、已结算、按车辆/日期筛选的收益明细 |
| `packages/account/pages/messages/index` | 消息 | 分类、未读、跳转关联订单/车辆 |
| `packages/account/pages/support/index` | 客服 | 常见问题、提交工单、查看处理状态 |
| `packages/account/pages/settings/index` | 设置 | 演示身份、数据重置、隐私说明 |

## 主导航和下单交互

首页 → 地址时间 → 货物 → 车型 → 确认报价 → 创建待支付订单 → 模拟支付 → 订单详情。

原图 004 保留“确认下单”文案，点击后进入图 005 的订单确认页；图 005 的“确认下单并支付”才正式提交。地图车辆详情是抽屉，不必新增一页。修改上游信息后立即废弃旧报价，并重新检查车型是否适用。

底部入口使用底部导航切换；分包业务页使用页面跳转。路由只传 `id`、`draftId` 和选择模式，联系人等完整对象不塞进 URL。地址选择结果通过明确的返回事件交给草稿状态。

## 补全原型的交互约定

- 待支付详情提供支付和取消；匹配/前往取件可取消；装货后用户不能直接取消，转客服。
- 车辆到取件点后显示“确认装货完成”；到收件点后显示“确认收货”。原型按钮模拟事件，生产版需设备反馈和身份校验。
- 取消后的退款进度在订单详情独立显示；支付失败仍留在待支付，可重新发起支付尝试。
- 车主任务页隐藏用户支付详情及非履约所需联系人信息，车主没有自主接单/定价按钮。
- 车主关闭共享只影响后续新任务，当前任务和已经承诺的预约必须处理完成或经平台协调。
- 收益页面明确“模拟收益”，首版不提供真实提现。
- 服务范围外、无车、报价过期、地图加载失败、权限拒绝、存储失败都有明确提示和返回/重试入口。

## 通用组件

`VehicleCard`、`AddressCard`、`CargoSummary`、`PriceBreakdown`、`OrderStatusTimeline`、`StatusBadge`、`EmptyState`、`ErrorState`、`LoadingState`、`BottomActionBar`。组件接受展示数据和事件，保持价格、状态文字映射一致。

页面样式采用原图的绿色主色、圆角卡片和地图抽屉。字体、间距、颜色统一为样式变量；微信顶部胶囊、安全区域和底部操作栏在真机验收时检查。
