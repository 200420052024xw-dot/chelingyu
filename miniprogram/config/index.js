"use strict";
/** 全局配置 —— 基础业务常量 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TAB_BAR = exports.MAP_DEFAULTS = exports.APP_CONFIG = void 0;
const env_1 = require("./env");
exports.APP_CONFIG = {
    appName: "无人车共享运力",
    brandTagline: "配送 / 跑腿 / 无人配送",
    defaultServiceRegionId: "region_yaohu",
    draftStorageKey: "cly:prototype:v1:db",
    schemaVersion: 2,
    demoUserId: "usr_customer_001",
    demoOwnerId: "owner_001",
    /** 演示地图中心：江西师范大学瑶湖校区 */
    demoCenter: { latitude: 28.6829, longitude: 115.8582 },
    /** 模拟模式：true=仅本地；false=可走真实接口（受 ENV.mockMode 控制） */
    get mockMode() {
        return env_1.ENV.mockMode;
    },
    /** 真实模式开关（mockMode=false 时才生效） */
    get useTencentMapsWebService() {
        return env_1.ENV.useTencentMapsWebService;
    },
    /** AppID 替换说明：实际部署时修改 project.config.json 中 appid 字段 */
    placeholderAppId: "touristappid000000",
};
exports.MAP_DEFAULTS = {
    scale: 16,
    minScale: 14,
    maxScale: 19,
};
exports.TAB_BAR = {
    color: "#9AA6B2",
    selectedColor: "#0E9C5E",
    backgroundColor: "#FFFFFF",
    borderStyle: "white",
};
