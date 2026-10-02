"use strict";

const fs = require("node:fs");
const path = require("node:path");

const source = path.join(__dirname, "../miniprogram/.env");
const target = path.join(__dirname, "../miniprogram/config/env.generated.js");
const values = {};
if (fs.existsSync(source)) {
  for (const line of fs.readFileSync(source, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^["'](.*)["']$/, "$1");
  }
}

const generated = {};
if (values.ORDER_API_BASE_URL) generated.orderApiBaseUrl = values.ORDER_API_BASE_URL;
if (values.ORDER_DEMO_AUTH !== undefined) generated.orderDemoAuth = /^(true|1|yes)$/i.test(values.ORDER_DEMO_AUTH);
if (values.TENCENT_MAPS_KEY) generated.tencentMapsKey = values.TENCENT_MAPS_KEY;
if (values.USE_TENCENT_MAPS_WEB_SERVICE !== undefined) {
  generated.useTencentMapsWebService = /^(true|1|yes)$/i.test(values.USE_TENCENT_MAPS_WEB_SERVICE);
}
if (values.TENCENT_MAPS_API_BASE) generated.tencentMapsApiBase = values.TENCENT_MAPS_API_BASE;
if (values.REQUEST_TIMEOUT_MS && Number.isFinite(Number(values.REQUEST_TIMEOUT_MS))) {
  generated.requestTimeoutMs = Number(values.REQUEST_TIMEOUT_MS);
}
if (values.MOCK_MODE !== undefined) generated.mockMode = /^(true|1|yes)$/i.test(values.MOCK_MODE);
fs.writeFileSync(target, `"use strict";\nexports.ENV_GENERATED = ${JSON.stringify(generated)};\n`);
console.log("[env] generated runtime configuration from miniprogram/.env (key omitted)");
