# 模拟数据填写说明

> **用法**：直接编辑 `miniprogram/fixtures/user-mock-data.json`，把里面每条占位替换成你想要的演示数据。  
> **生效方式**：保存文件 → 微信开发者工具中点「清缓存 → 清全部」→ 重新编译 → 数据生效。  
> **不填的字段**：保持原值不动即可，下面的 schema 会自动跳过未填字段，沿用 `seed.ts` 的默认演示值。

---

## 0. 快速开始

打开 `miniprogram/fixtures/user-mock-data.json`，文件长这样（每个字段含义见后面章节）：

```json
{
  "region": { ... },
  "demoUser": { ... },
  "addresses": [ ... ],
  "vehicleModels": [ ... ],
  "vehicles": [ ... ],
  "availability": [ ... ],
  "pricing": { ... },
  "revenueSharing": { ... },
  "notifications": [ ... ]
}
```

**只改你想改的部分**，其它字段直接从模板里删掉就保持默认。

---

## 1. 地图中心（`region`）

控制首页地图的中心点和顶部地区标签。

| 字段 | 类型 | 说明 | 示例 |
|---|---|---|---|
| `label` | string | 顶部地区主标签 | `"南昌·瑶湖校区"` |
| `sub` | string | 副标签 | `"江西师范大学瑶湖校区"` |
| `center.latitude` | number | 中心纬度（GCJ-02） | `28.6829` |
| `center.longitude` | number | 中心经度（GCJ-02） | `115.8582` |
| `radiusMeters` | number | 服务区半径（米） | `3000` |

---

## 2. 演示用户（`demoUser`）

普通用户与车主共用的演示账号。

| 字段 | 类型 | 说明 | 示例 |
|---|---|---|---|
| `nickname` | string | 顶部头像首字母来源 | `"小张同学"` |
| `avatarText` | string | 头像圆圈里显示的字（1 个） | `"张"` |
| `mobileMasked` | string | 显示用脱敏手机号 | `"138****0001"` |

---

## 3. 常用地址（`addresses`）

数组，每条一项。**至少 2 条**（一个默认寄件、一个默认收件），否则下单流程第一步会卡住。

| 字段 | 类型 | 说明 | 示例 |
|---|---|---|---|
| `id` | string | 唯一 ID（自己起） | `"addr_library"` |
| `name` | string | 地址名 | `"瑶湖图书馆"` |
| `detail` | string | 详细地址 | `"江西师范大学瑶湖校区图书馆"` |
| `latitude` | number | 纬度 | `28.6829` |
| `longitude` | number | 经度 | `115.8582` |
| `contactName` | string | 联系人 | `"测试用户"` |
| `contactMobile` | string | 脱敏手机号 | `"138****0001"` |
| `isDefaultSender` | bool | 是否默认寄件 | `true` |
| `isDefaultReceiver` | bool | 是否默认收件 | `false` |
| `label` | string | 类型：`home` / `company` / `school` / `other` | `"school"` |

---

## 4. 车型（`vehicleModels`）

数组，每条一项。**至少 1 条**，建议 2-3 条覆盖「小型厢式 / 中型厢式 / 冷链」。

| 字段 | 类型 | 说明 | 示例 |
|---|---|---|---|
| `id` | string | 唯一 ID | `"model_box_small"` |
| `code` | string | 内部编号 | `"XC-02"` |
| `name` | string | 显示名 | `"小型厢式无人车"` |
| `category` | string | `box_small` / `box_medium` / `cold_chain` / `special` | `"box_small"` |
| `description` | string | 描述 | `"性价比高，适合文件与轻物"` |
| `maxLoadGrams` | number | 最大载重（克） | `100000` = 100 kg |
| `cargoVolumeLiters` | number | 货厢容积（升） | `1200` |
| `supportsColdChain` | bool | 是否冷链 | `false` |
| `imagePath` | string | 图标路径（在 `assets/vehicles/` 下） | `"/assets/vehicles/box-small.png"` |

**单位换算**：1 kg = 1000 g；1 吨 = 1000000 g。

---

## 5. 车辆（`vehicles`）

数组，每条一项。**至少 2 辆**，建议 4-6 辆分布在你定的中心点附近。

| 字段 | 类型 | 说明 | 示例 |
|---|---|---|---|
| `id` | string | 唯一 ID | `"veh_001"` |
| `vehicleNo` | string | 车牌号 | `"CLY-NC-001"` |
| `modelId` | string | 对应 `vehicleModels` 的 id | `"model_box_small"` |
| `ownerShared` | bool | 是否车主已授权共享（关掉的车辆不会出现在首页） | `true` |
| `status` | string | `available` / `reserved` / `delivering` / `offline` 等 | `"available"` |
| `latitude` | number | 纬度（中心点 ±0.01 范围内可见） | `28.6852` |
| `longitude` | number | 经度 | `115.8612` |
| `batteryPercent` | number | 0-100 | `78` |
| `remainingRangeMeters` | number | 续航（米） | `35000` = 35 km |
| `imagePath` | string | 头像图 | `"/assets/vehicles/box-small.png"` |

**坐标建议**：围绕 `region.center` 在 ±0.005°（约 500m）内错落分布，4-6 辆能让首页地图有点击感。  
**电量建议**：50-90 之间随机；如果想做「低电警告」演示，把其中一辆设成 15。

---

## 6. 开放时段（`availability`）

数组，每辆车一条。

| 字段 | 类型 | 说明 | 示例 |
|---|---|---|---|
| `vehicleId` | string | 对应 `vehicles.id` | `"veh_001"` |
| `weekdays` | number[] | 1-7 的星期数组，全周就 `[1,2,3,4,5,6,7]` | `[1,2,3,4,5,6,7]` |
| `startTime` | string | 开始时间 `HH:MM` | `"08:00"` |
| `endTime` | string | 结束时间 `HH:MM` | `"22:00"` |

---

## 7. 价格（`pricing`）

单车对象，控制订单金额计算。

| 字段 | 类型 | 说明 | 示例 |
|---|---|---|---|
| `name` | string | 名称 | `"瑶湖校区标准配送价格"` |
| `minimumOrderAmountFen` | number | 起送价（分） | `500` = 5 元 |
| `maximumOrderAmountFen` | number | 单笔上限（分） | `150000` = 1500 元 |
| `baseFeeFen` | number | 基础费（分） | `500` |
| `includedDistanceMeters` | number | 含在基础费里的距离（米） | `0` |
| `extraDistanceFeeFenPerKm` | number | 超出后每公里加价（分） | `200` = 2 元/公里 |

**单位换算**：所有金额都是「分」，1 元 = 100 分。页面会自动展示为「¥x.xx」。

---

## 8. 分润（`revenueSharing`）

订单完成时分给各方的比例，**合计必须 = 10000**（万分比）。

| 字段 | 类型 | 说明 | 示例 |
|---|---|---|---|
| `name` | string | 规则名 | `"瑶湖校区默认分润"` |
| `shares` | 数组 | 各项分配 | 见下 |

`shares` 每条：

| 字段 | 类型 | 说明 | 示例 |
|---|---|---|---|
| `recipientType` | string | `platform` / `province_operator` / `city_operator` / `district_operator` / `vehicle_owner` | `"vehicle_owner"` |
| `basisPoints` | number | 万分比 | `7000` = 70% |

**示例**（平台 10% + 城市 5% + 区 5% + 车主 80%）：
```json
"shares": [
  { "recipientType": "platform", "basisPoints": 1000 },
  { "recipientType": "city_operator", "basisPoints": 500 },
  { "recipientType": "district_operator", "basisPoints": 500 },
  { "recipientType": "vehicle_owner", "basisPoints": 8000 }
]
```

---

## 9. 消息（`notifications`）

首页右上角红点 = 未读消息数。数组里**未读消息数**决定红点是否显示。

| 字段 | 类型 | 说明 | 示例 |
|---|---|---|---|
| `id` | string | 唯一 ID | `"notif_001"` |
| `type` | string | `order` / `vehicle` / `payment` / `settlement` / `system` | `"order"` |
| `title` | string | 标题 | `"订单已匹配"` |
| `content` | string | 内容 | `"您的订单已被车辆 veh_001 接单"` |
| `readAt` | string / null | 已读时间（ISO 8601），null 表示未读 | `null` |

---

## 10. 校验

JSON 编辑完后，可以在终端跑：

```bash
node -e "JSON.parse(require('fs').readFileSync('miniprogram/fixtures/user-mock-data.json','utf8')); console.log('OK')"
```

通过后到微信开发者工具「清缓存 → 重新编译」即可看到效果。

---

## 11. 重置回默认

删掉 `user-mock-data.json` 文件 → 应用自动回落到 `seed.ts` 里的默认演示数据。  
或者在「我的 → 设置 → 重置演示数据」里点一下也行。