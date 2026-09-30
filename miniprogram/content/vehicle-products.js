"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VEHICLE_CATALOG = exports.VEHICLE_PRODUCTS = void 0;
/** Catalogue derived from tangship/server/src/operations/vehicle-catalog.seed.ts.
 * Only enabled single delivery products are exposed here. */
exports.VEHICLE_PRODUCTS = {
    truck: {
        name: "智能配送货车",
        description: "按货物重量、包装尺寸和温控要求匹配配送货车。",
        level: "L4",
        maxLoad: "200–1,000 kg",
        range: "80–200 km",
        topSpeed: "15–35 km/h",
    },
};
exports.VEHICLE_CATALOG = [
    { id: "z2", code: "Z2", name: "Z2 智能配送车", description: "紧凑型配送车，适合社区末端配送与小件运输。", loadKg: 200, volumeLiters: 1500, dimensions: { length: 1200, width: 1000, height: 1200 }, cold: false, category: "box_small", image: "/assets/vehicles/autonomous-truck.png" },
    { id: "z5-2026", code: "Z5(2026)", name: "Z5(2026) 厢式货车", description: "中型厢式货车，适合电商配送与商超补货。", loadKg: 500, volumeLiters: 3000, dimensions: { length: 1800, width: 1400, height: 1400 }, cold: false, category: "box_medium", image: "/assets/vehicles/autonomous-truck.png" },
    { id: "l5-max", code: "L5Max", name: "L5Max 智能物流车（增强版）", description: "适合大型园区物流、长距离转运与多站点配送。", loadKg: 550, volumeLiters: 3200, dimensions: { length: 1900, width: 1400, height: 1400 }, cold: false, category: "box_medium", image: "/assets/vehicles/autonomous-truck.png" },
    { id: "z8", code: "Z8", name: "Z8 常温配送车", description: "适合城市配送、区域物流与大宗货物运输。", loadKg: 800, volumeLiters: 5000, dimensions: { length: 2400, width: 1600, height: 1500 }, cold: false, category: "box_medium", image: "/assets/vehicles/autonomous-truck.png" },
    { id: "z8-max", code: "Z8Max", name: "Z8Max 常温配送车（增强版）", description: "适合大型物流中心与远距离运输。", loadKg: 1000, volumeLiters: 6000, dimensions: { length: 2600, width: 1700, height: 1600 }, cold: false, category: "box_medium", image: "/assets/vehicles/autonomous-truck.png" },
    { id: "z5-c", code: "Z5-C", name: "Z5-C 冷藏配送车", description: "冷藏运输，适合生鲜、医药与乳品配送。", loadKg: 450, volumeLiters: 2800, dimensions: { length: 1800, width: 1400, height: 1300 }, cold: true, category: "cold_chain", image: "/assets/vehicles/autonomous-truck.png" },
    { id: "z8-max-c", code: "Z8Max-C", name: "Z8Max 冷藏配送车", description: "大容量冷链配送，支持远距离生鲜与医药运输。", loadKg: 900, volumeLiters: 5500, dimensions: { length: 2500, width: 1700, height: 1500 }, cold: true, category: "cold_chain", image: "/assets/vehicles/autonomous-truck.png" },
    { id: "z5-multi", code: "Z5-Multi", name: "Z5 多格货柜车", description: "六格货柜，适合多商户配送与分类运输。", loadKg: 480, volumeLiters: 3000, dimensions: { length: 1800, width: 1400, height: 1400 }, cold: false, category: "box_medium", image: "/assets/vehicles/autonomous-truck.png" },
];
