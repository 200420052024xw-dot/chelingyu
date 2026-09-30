"use strict";

const fs = require("node:fs");
const path = require("node:path");

const fixturesDir = path.join(__dirname, "..", "miniprogram", "fixtures");
const source = path.join(fixturesDir, "user-mock-data.json");
const destination = path.join(fixturesDir, "user-mock-data.js");
const data = JSON.parse(fs.readFileSync(source, "utf8"));
const moduleSource =
  "// Generated from user-mock-data.json. Run npm run build:miniprogram after editing the JSON.\n" +
  "module.exports = " + JSON.stringify(data, null, 2) + ";\n";
fs.writeFileSync(destination, moduleSource, "utf8");
