"use strict";
/**
 * 本地环境配置（用户实际填写）。
 *
 * ⚠ 这个文件已在 .gitignore 中被忽略，请勿提交到仓库。
 * ⚠ 如果还没有 key，把 tencentMapsKey 留空，useTencentMapsWebService 保持 false，
 *    未使用 WebService 时原生地图不需要该 key。
 *
 * 申请腾讯地图 WebService Key：
 *   1. https://lbs.qq.com/  → 控制台 → 应用管理 → 创建应用
 *   2. 应用类型选「微信小程序」
 *   3. 勾选至少「距离计算」和「坐标转换」这两个 WebService
 *   4. 把 project.config.json 里的 appid (wxc96d8acaea5bc77a) 填入白名单
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV_LOCAL = void 0;
exports.ENV_LOCAL = {
    // ↓↓↓ 把这里替换成你自己的 key ↓↓↓
    tencentMapsKey: "",
    // 只有配置真实 key 后才启用距离 WebService。
    useTencentMapsWebService: false,
    // 接口域名（一般不用改）
    tencentMapsApiBase: "https://apis.map.qq.com",
    // 请求超时（毫秒）
    requestTimeoutMs: 8000,
    // 业务数据保存在本机，流程使用模拟数据。
    mockMode: true,
};
