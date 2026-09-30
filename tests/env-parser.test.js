/**
 * 测试 miniprogram/config/env.ts 中的 parseDotEnv 逻辑。
 * 这里复制一份实现（避免引入 miniprogram 依赖），跑相同用例。
 * 如果两份实现出现差异，env.ts 那份就是 bug。
 */

function parseDotEnv(content) {
  const map = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx < 0) return;
    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    v = v.replace(/^["'](.*)["']$/, "$1");
    map[k] = v;
  });
  const out = {};
  if (map.tencentMapsKey || map.TENCENT_MAPS_KEY) {
    out.tencentMapsKey = (map.tencentMapsKey ?? map.TENCENT_MAPS_KEY).trim();
  }
  const flagStr = (k) => map[k] === "true" || map[k] === "1" || map[k] === "yes";
  const flag = (snake, camel) => {
    if (map[snake] !== undefined) return flagStr(snake);
    if (map[camel] !== undefined) return flagStr(camel);
    return undefined;
  };
  const webSvc = flag("USE_TENCENT_MAPS_WEB_SERVICE", "useTencentMapsWebService");
  if (webSvc !== undefined) out.useTencentMapsWebService = webSvc;
  if (map.tencentMapsApiBase || map.TENCENT_MAPS_API_BASE) {
    out.tencentMapsApiBase = map.tencentMapsApiBase ?? map.TENCENT_MAPS_API_BASE;
  }
  const toField = (k) => {
    const v = parseInt(map[k], 10);
    return !isNaN(v) ? v : undefined;
  };
  if (map.requestTimeoutMs !== undefined) {
    const n = toField("requestTimeoutMs");
    if (n !== undefined) out.requestTimeoutMs = n;
  } else if (map.REQUEST_TIMEOUT_MS !== undefined) {
    const n = toField("REQUEST_TIMEOUT_MS");
    if (n !== undefined) out.requestTimeoutMs = n;
  }
  const mock = flag("MOCK_MODE", "mockMode");
  if (mock !== undefined) out.mockMode = mock;
  return out;
}

// === 测试用例 ===
const tests = [];
let pass = 0, fail = 0;

function t(name, fn) {
  tests.push({ name, fn });
}

t("用户当前的 .env 应该正确解析", () => {
  const r = parseDotEnv(`TENCENT_MAPS_KEY=TEST-KEY-NOT-REAL
USE_TENCENT_MAPS_WEB_SERVICE=true
TENCENT_MAPS_API_BASE=https://apis.map.qq.com
REQUEST_TIMEOUT_MS=8000
MOCK_MODE=true`);
  if (r.tencentMapsKey !== "TEST-KEY-NOT-REAL") throw new Error("key 未解析");
  if (r.useTencentMapsWebService !== true) throw new Error("useTencentMapsWebService 未解析");
  if (r.tencentMapsApiBase !== "https://apis.map.qq.com") throw new Error("apiBase 未解析");
  if (r.requestTimeoutMs !== 8000) throw new Error("timeout 未解析");
  if (r.mockMode !== true) throw new Error("mockMode 未解析");
});

t("用户原来写的 key=... 不被解析（错误字段名）", () => {
  const r = parseDotEnv("key=BPJBZ-XXXX\nUSE_TENCENT_MAPS_WEB_SERVICE=true");
  if (r.tencentMapsKey !== undefined) throw new Error("错误：'key' 被识别了，应该忽略");
  if (r.useTencentMapsWebService !== true) throw new Error("flag 应仍然正确");
});

t("驼峰命名也能解析", () => {
  const r = parseDotEnv("tencentMapsKey=OB4BZ-XXXX\nuseTencentMapsWebService=false\nmockMode=false");
  if (r.tencentMapsKey !== "OB4BZ-XXXX") throw new Error("camelCase key 未解析");
  if (r.useTencentMapsWebService !== false) throw new Error("false flag 未解析");
  if (r.mockMode !== false) throw new Error("mockMode=false 未解析");
});

t("注释行被忽略", () => {
  const r = parseDotEnv("# comment\nTENCENT_MAPS_KEY=OB4BZ\n# another\nUSE_TENCENT_MAPS_WEB_SERVICE=true");
  if (r.tencentMapsKey !== "OB4BZ") throw new Error("注释行未过滤");
  if (r.useTencentMapsWebService !== true) throw new Error("flag 未被正确解析");
});

t("带引号的值", () => {
  const r = parseDotEnv('TENCENT_MAPS_KEY="OB4BZ-D4W3U-XXXX"\nUSE_TENCENT_MAPS_WEB_SERVICE=true');
  if (r.tencentMapsKey !== "OB4BZ-D4W3U-XXXX") throw new Error("引号未被剥离");
});

t("空行被忽略", () => {
  const r = parseDotEnv("\n\nTENCENT_MAPS_KEY=OB4BZ\n\n");
  if (r.tencentMapsKey !== "OB4BZ") throw new Error("空行未被忽略");
});

t("flag=true 的常见变体", () => {
  for (const v of ["true", "1", "yes"]) {
    const r = parseDotEnv(`USE_TENCENT_MAPS_WEB_SERVICE=${v}`);
    if (r.useTencentMapsWebService !== true) throw new Error(`'${v}' 应被识别为 true`);
  }
});

t("没有 USE_TENCENT_MAPS_WEB_SERVICE 时不返回该字段", () => {
  const r = parseDotEnv("TENCENT_MAPS_KEY=OB4BZ");
  if ("useTencentMapsWebService" in r) throw new Error("未声明的 flag 不应出现在结果");
});

t("空值的 key 行被忽略（视为未配置）", () => {
  const r = parseDotEnv("TENCENT_MAPS_KEY=\nUSE_TENCENT_MAPS_WEB_SERVICE=true");
  if ("tencentMapsKey" in r) throw new Error("空值行不应出现在结果中");
  if (r.useTencentMapsWebService !== true) throw new Error("其他 flag 应仍然正确");
});

// 运行
for (const { name, fn } of tests) {
  try {
    fn();
    pass++;
    console.log("  ✓", name);
  } catch (e) {
    fail++;
    console.error("  ✗", name, "-", e.message);
  }
}
console.log(`\n共 ${tests.length} 用例：通过 ${pass}，失败 ${fail}`);
process.exit(fail > 0 ? 1 : 0);