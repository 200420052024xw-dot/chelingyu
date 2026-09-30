# 配送车型来源

小程序的按趟配送车型以 [tangship 的车辆目录](https://github.com/200420052024xw-dot/tangship/blob/main/server/src/operations/vehicle-catalog.seed.ts) 为准，只同步其中已启用的 8 款货运车型：Z2、Z5(2026)、L5Max、Z8、Z8Max、Z5-C、Z8Max 冷藏车、Z5 多格货柜车。停用车型、载客观光车、安防车、底盘和自动驾驶套件不作为配送车型。

车型名称、载重、货厢容积、尺寸和冷链标记同步到 `miniprogram/content/vehicle-products.ts`，由 `miniprogram/fixtures/seed.ts` 建立本地演示目录。只有真实种子车辆有地图坐标；总部调车方案不生成附近车辆标记，也不虚构到达时间。没有本地兼容车辆时，用户需先确认总部运力，再支付。

当前版本为本地演示数据：总部确认按钮演示申请与确认过程，不代表已连接真实调度系统。
