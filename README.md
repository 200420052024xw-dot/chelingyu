# 无人车共享运力平台 · 微信小程序原型

本项目包含微信小程序原生版（TypeScript + WXML + WXSS）、共享订单 API 和独立 Web 运营后台。未配置共享 API 时，小程序仍可用本地数据演示；配置后订单、车辆开放时段和区域调度使用同一服务。真实支付、车载定位和结算仍处于模拟阶段。部署步骤与功能边界见[共享订单与运营后台运行说明](docs/共享订单与运营后台运行说明.md)。

---

## 一、运行方式

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 选择「导入项目」：
   - 项目目录：本仓库根目录 `F:\CheLingYu`
   - AppID：默认 `touristappid000000`（游客模式，可直接进入），详见[第五章](#五appid-替换位置)
3. 编译运行后，默认进入「首页 / 地图选车」页面。
4. 首次进入会从 `miniprogram/fixtures/seed.ts` 注入演示数据到本地存储。

工程保留 TypeScript 源码，同时提交对应的 JavaScript 运行文件，以兼容未启用 TypeScript 插件的微信开发者工具。修改 `.ts` 后执行 `npm run build:miniprogram`，再回到开发者工具重新编译。

---

## 二、目录结构

```
F:\CheLingYu
├─ miniprogram/
│  ├─ app.ts / app.js / app.json / app.wxss / app.d.ts
│  ├─ config/                 全局配置（地图中心、AppID、Tab 列表等）
│  ├─ contracts/              类型契约（与平台数据模型一致）
│  ├─ adapters/               适配层：storage / clock / identity / geo / location
│  ├─ domain/                 纯领域逻辑：校验、定价、调度、状态机、收入分配
│  ├─ fixtures/               演示数据 Seed
│  ├─ repositories/           本地仓储（订阅者模式 + commit）
│  ├─ stores/                 会话、订单草稿
│  ├─ services/               业务服务：订单、支付、调度、车辆、消息、客服等
│  ├─ view-models/            视图模型（金额/状态/时间格式化）
│  ├─ components/             复用组件：status-badge、empty-state
│  ├─ implementations/mock/   Mock 行为实现（地图、支付、退款）
│  ├─ assets/                 图标、车辆图、Tab 图
│  ├─ pages/
│  │  ├─ home/                首页（地图 + 附近车辆 + 抽屉）
│  │  ├─ orders/              订单列表
│  │  └─ profile/             个人中心
│  └─ packages/               分包（按角色隔离）
│     ├─ delivery/            下单流程：地址 / 货物 / 选车型 / 确认 / 详情
│     ├─ owner/               车主端：车辆 / 绑定 / 详情 / 可用时段 / 任务 / 收益
│     └─ account/             账户：消息 / 客服 / 设置
├─ scripts/gen_assets.py      PNG 资源生成器（无需 Pillow）
├─ tests/                     单元测试（领域逻辑）
├─ docs/                      项目设计文档
└─ project.config.json        小程序工程配置（含 AppID）
```

---

## 三、演示流程

### 3.1 下单用户视角（默认身份）
1. **首页地图**：显示瑶湖校区附近 6 辆演示车辆（4 辆已绑定，2 辆未绑定），点击车辆查看抽屉。
2. **「我要用车」**：进入下单流程：
   1. **地址**：选择起/收货地址（可新建 / 编辑）。
   2. **货物**：填写重量、体积、类型、备注（带校验）。
   3. **车型**：根据货物推荐合适车型，附报价。
   4. **确认**：展示费用明细 → 调起 Mock 支付 → 成功创建订单。
3. **订单详情**：时间线状态推进；可触发「模拟推进」「取消订单」「确认收货」。
4. **消息中心**：实时接收订单状态通知（订单 / 支付 / 系统分类）。
5. **个人中心**：查看用户信息、统计、入口。

### 3.2 车主视角
1. 在「设置 → 切换为车主」进入车主身份。
2. **车辆列表**：展示已绑定 / 可绑定车辆。
3. **车辆详情 / 可用时段**：维护每周可用时间段。
4. **任务**：查看分配给该车的订单任务。
5. **收益**：累计收益、本周/本月统计、收益明细。

### 3.3 演示时钟推进
- 「设置 → 演示时钟」可推进 30 分钟，便于快速验证订单状态机、可用时段、收益分配等时间敏感逻辑。
- 「设置 → 重置演示数据」可一键恢复初始 Seed。

---

## 四、模拟边界（重要）

> 本原型严格遵守以下边界，不与真实业务系统发生任何通信。

| 类别 | 行为 | 边界 |
| --- | --- | --- |
| **支付** | `services/payment.ts` 中的 `payMock` | 永不调用真实支付接口；通过 `scenario` 字段模拟成功 / 失败 / 取消 |
| **退款** | `services/order.ts` 中的 `refundForOrder` | 内部状态变更，不调用任何第三方 |
| **调度** | `services/order.ts` 中的 `tryMatch` / `runDispatch` | 依据车辆可用时段、距离、车型匹配，本地完成 |
| **车辆移动** | `adapters/location.ts` | 演示用固定坐标，不接入真实 GPS |
| **地图** | `pages/home` | 占位底图 + 自绘标记，**不调用 `wx.getLocation` 真实定位** |
| **消息推送** | `services/notification.ts` | 写入本地存储的 `notifications` 列表；不调用 `wx.requestSubscribeMessage` |
| **客服** | `packages/account/pages/support` | 演示热线为占位号 `400-000-0000`，仅作 UI 演示 |
| **个人信息** | `fixtures/seed.ts` | 使用明确虚构的姓名 / 手机号 / 地址 |
| **手机号脱敏** | `services/owner.ts` 中的 `maskAddress` 等 | 列表中显示 `138****0000` 形式 |
| **需要搬运** | `pages/profile` 入口 | 提示「暂不支持」，并阻止进入下单确认 |
| **OpenID / 设备标识** | 全局 | **不记录、不展示、不上报** |

---

## 五、AppID 替换位置

需要替换为正式 AppID 时，**只改一处**：

📍 `F:\CheLingYu\project.config.json` 第 4 行

```jsonc
{
  "miniprogramRoot": "miniprogram/",
  "projectname": "chelingyu-prototype",
  "appid": "touristappid000000",   // ← 替换为正式 AppID
  ...
}
```

> 提示：游客模式（`touristappid000000`）无法使用正式接口（如 `wx.login`、支付等）。本原型不依赖这些接口，但替换 AppID 后请在「微信公众平台」后台配置合法域名。

---

## 五·一、腾讯地图 WebService Key 配置

> 原生 `<map>` 组件由微信客户端按 AppID 自动提供瓦片，**不**需要 key。下面说的是「WebService API」（距离矩阵、地理编码、路线规划等 HTTP 接口）的配置方法。

**步骤**：

1. 在 [lbs.qq.com 控制台](https://lbs.qq.com/) → 应用管理 → 创建应用
2. 应用类型选 **微信小程序**，勾选至少「距离计算」「坐标转换」
3. 把 `project.config.json` 里的 appid 填入白名单
4. 复制示例文件并填入 key：

   ```bash
   cp miniprogram/config/env.local.ts.example miniprogram/config/env.local.ts
   ```

5. 打开 `env.local.ts`，把 `tencentMapsKey` 改成你申请到的值。
6. 把 `useTencentMapsWebService` 设为 `true`（保持 `false` 则继续走 mock）。
7. 重启微信开发者工具。

**配置文件**：

| 文件 | 是否入库 | 说明 |
|---|---|---|
| `miniprogram/config/env.ts` | ✅ 是 | 类型 + 加载逻辑 + 默认值 |
| `miniprogram/config/env.local.ts.example` | ✅ 是 | 模板，方便复制 |
| `miniprogram/config/env.local.ts` | ❌ 否（`.gitignore`） | **真实 key 写在这里** |

**调用方法**（任何服务都可以这样用）：

```ts
import { distanceByWebService, isWebServiceEnabled } from "./adapters/tencent-maps";
import { haversineMeters } from "./adapters/geo";

async function distance(a: GeoPoint, b: GeoPoint) {
  if (isWebServiceEnabled()) {
    try {
      const r = await distanceByWebService(a, b, "driving");
      return r.meters;
    } catch (e) {
      console.warn("[distance] WebService 失败，回落 haversine", e);
    }
  }
  return haversineMeters(a, b);
}
```

`app.ts` 启动时会把当前 env 配置打印到控制台，方便确认 key 是否生效：

```
[env]
  ⚠ 腾讯地图 WebService key 未配置（miniprogram/config/env.local.ts）。需要真实距离/路线时再填。
  • useTencentMapsWebService = false
  • mockMode = true
  • apiBase = https://apis.map.qq.com
```

---

## 六、核心设计要点

### 6.1 状态机严格分离
订单状态 / 支付状态 / 退款状态采用三套独立枚举，避免相互污染：

```ts
// contracts/types.ts
type OrderStatus =
  | "pending_payment" | "paid" | "vehicle_to_pickup" | "picking_up"
  | "in_transit" | "delivered" | "completed" | "cancelled" | "refunded";
type PaymentStatus = "unpaid" | "paying" | "succeeded" | "failed" | "refunded";
type RefundStatus  = "none" | "requested" | "approved" | "rejected" | "settled";
```

转换规则集中在 [`miniprogram/domain/order-state.ts`](miniprogram/domain/order-state.ts) 的 `TRANSITIONS` 映射表中，所有写入路径都需通过 `canTransition` 校验。

### 6.2 报价与草稿版本
- 草稿修改（`mutate`）会自增 `draft.revision`，并自动清空已绑定报价。
- 报价绑定时记录 `draftRevision` 与 `inputFingerprint`（地址 + 货物 + 车型哈希）。
- `services/pricing.ts#validateQuoteForCreate` 在下单前再校验一次，确保报价与当前草稿一致，否则报错。

### 6.3 幂等性
- `orderService.create` 通过 `acceptedQuoteId` 去重：相同报价 ID 的二次请求直接返回原订单。
- `paymentService.payMock` 通过 `orderId + scenario` 去重，避免重复扣款。
- `orderService.settleRevenue` 写入前检查 `earnings` 是否已有相同 `orderId` 的分账记录。

### 6.4 收入分配
车主 / 平台分账采用**基点**（basis points，`10000 = 100%`）避免浮点误差，余数归车主，确保总额守恒。详见 [`miniprogram/domain/revenue.ts`](miniprogram/domain/revenue.ts)。

### 6.5 服务范围 vs 行政区域
车辆 / 订单绑定的是「服务范围（service area）」，与「行政区域（region）」解耦。`fixtures/seed.ts` 中演示服务范围为「瑶湖校区」。

### 6.6 车辆可用时段
- 车主在「可用时段」维护每周时间范围。
- 下单时 `domain/scheduling.ts#evaluateVehicleForCargo` 检查预计装货时间是否落在可用窗口内。
- 预约订单会通过 `VehicleReservation` 锁定时段，避免重复派单。

---

## 七、已知限制

- 当前车辆图片是演示占位素材。后续替换时，将图片放入 `miniprogram/assets/vehicles/`，并按车型更新 `miniprogram/fixtures/seed.ts` 中各 `VehicleModel.imageUrl`；首页、车型选择、确认页和订单详情会自动使用对应车型图片。
- 地图为占位渲染，未接入 `wx.getLocation` / 真实腾讯地图 SDK（WebService 已预留 `tencent-maps.ts` adapter，未默认启用；填 key 后可切真实距离/路线）。
- 支付 / 退款 / 客服为纯 UI 演示，不存在任何外部通信。
- 未实现「需要搬运」功能：在「个人中心」入口展示「暂不支持」提示。
- 未实现「骑手端」（演示中由 `tryMatch` 自动撮合）。
- 单元测试目前仅覆盖 `domain/` 纯逻辑（定价、状态机、分账），UI 层依赖微信开发者工具调试器。

---

## 八、单元测试

`tests/` 目录包含定价、状态机、分账、可用时段等纯函数测试。建议在 Node 环境运行（无需小程序基础库）：

```bash
cd tests
npx ts-node pricing.test.ts
npx ts-node order-state.test.ts
npx ts-node revenue.test.ts
```

> 注：测试需要 `ts-node` 或 `tsx`，可使用任意 TypeScript 执行器运行。

---

## 九、相关文档

- [`docs/无人车共享运力平台升级改造总体方案.md`](docs/无人车共享运力平台升级改造总体方案.md) — 总体产品方案
- [`docs/微信小程序开发实施说明.md`](docs/微信小程序开发实施说明.md) — 本次实施说明
- [`architecture_design/`](architecture_design/) — 架构设计
- [`data_design/`](data_design/) — 数据模型设计
- [`fronted_design/`](fronted_design/) — 前端设计稿

---

## 十、版本

`v1.0.0-demo` · 仅本地演示版 · 不含真实业务接口
