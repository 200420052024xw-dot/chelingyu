"use strict";

const fs = require("node:fs");
const path = require("node:path");
const automator = require("miniprogram-automator");

async function inspectElement(page, selector) {
  const element = await page.$(selector);
  if (!element) return null;
  return {
    selector,
    tagName: element.tagName,
    size: await element.size(),
    offset: await element.offset(),
    display: await element.style("display"),
    visibility: await element.style("visibility"),
    opacity: await element.style("opacity"),
    text: await element.text(),
  };
}

(async () => {
  const logs = [];
  const exceptions = [];
  const miniProgram = await automator.launch({
    cliPath: "E:\\微信web开发者工具\\cli.bat",
    projectPath: path.resolve(__dirname, ".."),
    trustProject: true,
    timeout: 60000,
  });

  miniProgram.on("console", (entry) => logs.push(entry));
  miniProgram.on("exception", (entry) => exceptions.push(entry));

  const page = await miniProgram.reLaunch("/pages/home/index");
  await page.waitFor(5000);

  const outputDir = path.resolve(__dirname, ".artifacts");
  fs.mkdirSync(outputDir, { recursive: true });
  const screenshotPath = path.join(outputDir, "home-simulator.png");
  await miniProgram.screenshot({ path: screenshotPath });

  const result = {
    page: {
      path: page.path,
      query: page.query,
      size: await page.size(),
      data: await page.data(),
    },
    elements: [],
    logs,
    exceptions,
    screenshotPath,
  };

  for (const selector of [
    ".page-home",
    ".map",
    ".map-fallback",
    ".top-bar",
    ".message-button",
    ".me-pin",
    ".page-home-overlays",
    ".bottom-card",
  ]) {
    result.elements.push(await inspectElement(page, selector));
  }

  console.log(JSON.stringify(result, null, 2));
  miniProgram.disconnect();
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
