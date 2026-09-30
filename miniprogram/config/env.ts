/**
 * 运行时环境配置（key、域名、开关）。
 *
 * 用法：
 *   import { ENV } from "./env";
 *   wx.request({ url: `${ENV.tencentMapsApiBase}/ws/distance`, data: { key: ENV.tencentMapsKey, ... } });
 *
 * 约定：
 *   - 优先使用构建时从 miniprogram/.env 生成的配置（生成文件被 .gitignore 忽略）
 *   - 也兼容 env.local.ts；没有配置时使用 ENV_DEFAULTS
 *
 * 关于腾讯地图 key：
 *   - 小程序原生 <map> 组件无需 key：腾讯地图瓦片由微信客户端按 AppID 自动提供
 *   - WebService API（地理编码、距离矩阵、路线规划）需要在 https://lbs.qq.com/ 单独申请 key
 *   - 申请时"应用类型"选「微信小程序」，"APPID" 填 project.config.json 里的 appid
 */

export interface EnvConfig {
  /** 腾讯位置服务 WebService API Key（lbs.qq.com 控制台申请） */
  tencentMapsKey: string;
  /** 是否在演示模式下也调用真实 WebService；为 false 时距离/ETA 全部走本地 mock */
  useTencentMapsWebService: boolean;
  /** WebService 接口前缀（一般不用改） */
  tencentMapsApiBase: string;
  /** 单次请求超时（毫秒） */
  requestTimeoutMs: number;
  /** Mock 开关：true = 全本地；false = 关键路径用真实接口 */
  mockMode: boolean;
}

const ENV_DEFAULTS: EnvConfig = {
  tencentMapsKey: "",
  useTencentMapsWebService: false,
  tencentMapsApiBase: "https://apis.map.qq.com",
  requestTimeoutMs: 8000,
  mockMode: true,
};

// 加载 env.local.ts（用户填的真实值）。失败时给空对象。
function loadLocal(): Partial<EnvConfig> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("./env.local");
    if (mod && mod.ENV_LOCAL && typeof mod.ENV_LOCAL === "object") {
      return mod.ENV_LOCAL as Partial<EnvConfig>;
    }
    return {};
  } catch (e) {
    // env.local.ts 不存在是合法状态 —— 此时用 defaults
    return {};
  }
}

/**
 * 解析 .env 风格文件（KEY=value，# 开头是注释）。
 * 支持的字段名（大小写都接受）：
 *   TENCENT_MAPS_KEY / tencentMapsKey
 *   USE_TENCENT_MAPS_WEB_SERVICE / useTencentMapsWebService (true|false)
 *   TENCENT_MAPS_API_BASE / tencentMapsApiBase
 *   REQUEST_TIMEOUT_MS / requestTimeoutMs
 *   MOCK_MODE / mockMode (true|false)
 */
function parseDotEnv(content: string): Partial<EnvConfig> {
  const map: Record<string, string> = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx < 0) return;
    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    // 去掉首尾成对引号
    v = v.replace(/^["'](.*)["']$/, "$1");
    map[k] = v;
  });
  const out: Partial<EnvConfig> = {};
  if (map.tencentMapsKey || map.TENCENT_MAPS_KEY) {
    out.tencentMapsKey = (map.tencentMapsKey ?? map.TENCENT_MAPS_KEY).trim();
  }
  const flagStr = (k: string) =>
    map[k] === "true" || map[k] === "1" || map[k] === "yes";
  const flag = (snake: string, camel: string): boolean | undefined => {
    if (map[snake] !== undefined) return flagStr(snake);
    if (map[camel] !== undefined) return flagStr(camel);
    return undefined;
  };
  const webSvc = flag("USE_TENCENT_MAPS_WEB_SERVICE", "useTencentMapsWebService");
  if (webSvc !== undefined) out.useTencentMapsWebService = webSvc;
  if (map.tencentMapsApiBase || map.TENCENT_MAPS_API_BASE) {
    out.tencentMapsApiBase = (map.tencentMapsApiBase ?? map.TENCENT_MAPS_API_BASE);
  }
  const to = flag("REQUEST_TIMEOUT_MS", "requestTimeoutMs");
  if (map.requestTimeoutMs !== undefined) {
    const n = parseInt(map.requestTimeoutMs, 10);
    if (!isNaN(n)) out.requestTimeoutMs = n;
  } else if (map.REQUEST_TIMEOUT_MS !== undefined) {
    const n = parseInt(map.REQUEST_TIMEOUT_MS, 10);
    if (!isNaN(n)) out.requestTimeoutMs = n;
  }
  const mock = flag("MOCK_MODE", "mockMode");
  if (mock !== undefined) out.mockMode = mock;
  return out;
}

/**
 * 尝试从 miniprogram/.env 读取（如果存在）。
 * 文件必须放在 miniprogram/ 内才会被打包进来 —— root .env 读不到。
 */
function loadDotEnv(): Partial<EnvConfig> {
  try {
    // 微信小程序运行时可用 fs API 读相对路径（相对 miniprogram/）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fs = (wx as any).getFileSystemManager();
    if (!fs || typeof fs.readFileSync !== "function") return {};
    // 兼容两种常见放法
    const candidates = ["./.env", "./.env.local", "./config/.env"];
    for (const p of candidates) {
      try {
        const content = fs.readFileSync(p, "utf8");
        if (content && content.length > 0) {
          return parseDotEnv(content);
        }
      } catch (_) {
        // 试下一个
      }
    }
    return {};
  } catch (e) {
    return {};
  }
}

const LOCAL = loadLocal();
const DOTENV = loadDotEnv();
function loadGenerated(): Partial<EnvConfig> {
  try {
    const mod = require("./env.generated");
    return mod.ENV_GENERATED || {};
  } catch (_) {
    return {};
  }
}
const GENERATED = loadGenerated();

export const ENV: EnvConfig = {
  tencentMapsKey: (
    GENERATED.tencentMapsKey || LOCAL.tencentMapsKey || DOTENV.tencentMapsKey || ENV_DEFAULTS.tencentMapsKey
  ).trim(),
  useTencentMapsWebService:
    GENERATED.useTencentMapsWebService ??
    (LOCAL.tencentMapsKey ? LOCAL.useTencentMapsWebService : undefined) ??
    DOTENV.useTencentMapsWebService ??
    ENV_DEFAULTS.useTencentMapsWebService,
  tencentMapsApiBase:
    GENERATED.tencentMapsApiBase ?? LOCAL.tencentMapsApiBase ?? DOTENV.tencentMapsApiBase ?? ENV_DEFAULTS.tencentMapsApiBase,
  requestTimeoutMs:
    GENERATED.requestTimeoutMs ?? LOCAL.requestTimeoutMs ?? DOTENV.requestTimeoutMs ?? ENV_DEFAULTS.requestTimeoutMs,
  mockMode: GENERATED.mockMode ?? LOCAL.mockMode ?? DOTENV.mockMode ?? ENV_DEFAULTS.mockMode,
};

/**
 * 启动期自检：缺关键 key 时在控制台打 warn，不抛错（演示模式允许无 key 运行）。
 */
export function reportEnvStatus(): void {
  const lines: string[] = [];
  if (ENV.useTencentMapsWebService && !ENV.tencentMapsKey) {
    lines.push(
      "⚠ 腾讯地图 WebService key 未配置。",
    );
    lines.push(
      "  任选一种 ↓",
    );
    lines.push("    1) miniprogram/config/env.local.ts  →  填入 ENV_LOCAL.tencentMapsKey");
    lines.push("    2) miniprogram/.env                 →  TENCENT_MAPS_KEY=OB4BZ-...");
    lines.push("  （根目录 .env 不会被小程序运行时读到，必须放在 miniprogram/ 内）");
  } else if (ENV.tencentMapsKey) {
    const masked = ENV.tencentMapsKey.slice(0, 4) + "****" + ENV.tencentMapsKey.slice(-4);
    lines.push(`✓ tencentMapsKey = ${masked}`);
  }
  lines.push(`• useTencentMapsWebService = ${ENV.useTencentMapsWebService}`);
  lines.push(`• 本地模拟接口 = ${ENV.mockMode ? "已启用" : "已关闭"}`);
  lines.push(`• apiBase = ${ENV.tencentMapsApiBase}`);
  console.info("[env]\n  " + lines.join("\n  "));
}
