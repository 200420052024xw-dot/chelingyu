const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../miniprogram");
const sourceFiles = [];

function collectJavaScriptFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectJavaScriptFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      sourceFiles.push(fullPath);
    }
  }
}

collectJavaScriptFiles(root);

const failures = [];
const requirePattern = /require\((['"])([^'"]+)\1\)/g;

for (const filePath of sourceFiles) {
  const source = fs.readFileSync(filePath, "utf8");
  let match;

  while ((match = requirePattern.exec(source)) !== null) {
    const request = match[2];
    if (!request.startsWith(".")) continue;

    const target = path.resolve(path.dirname(filePath), request);
    const resolvesToFile = [target, `${target}.js`].some(
      (candidate) => candidate.endsWith(".js") && fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
    );

    if (!resolvesToFile) {
      failures.push(
        `${path.relative(root, filePath)}: require("${request}") 无法直接解析到文件`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("[module-resolution] 发现微信小程序不支持的模块路径：");
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}

console.log(
  `[module-resolution] ${sourceFiles.length} 个 JS 文件的相对 require 均可直接解析`,
);

const mockJson = JSON.parse(fs.readFileSync(path.join(root, "fixtures/user-mock-data.json"), "utf8"));
const mockModule = require(path.join(root, "fixtures/user-mock-data.js"));
if (JSON.stringify(mockJson) !== JSON.stringify(mockModule)) {
  console.error("[module-resolution] user-mock-data.js 与 JSON 源文件不一致，请运行 npm run build:miniprogram");
  process.exit(1);
}
