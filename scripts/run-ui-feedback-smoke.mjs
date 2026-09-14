import { readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { readdirSync, statSync } from "node:fs";

const sourceRoot = "src";
const checkedExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const forbiddenPatterns = [
  {
    pattern: /\bwindow\.alert\s*\(/,
    reason: "브라우저 기본 alert 대신 Toast 또는 Modal을 사용하세요.",
  },
  {
    pattern: /\bwindow\.confirm\s*\(/,
    reason: "브라우저 기본 confirm 대신 ConfirmDialog를 사용하세요.",
  },
  {
    pattern: /\bwindow\.prompt\s*\(/,
    reason: "브라우저 기본 prompt 대신 Modal 입력 UI를 사용하세요.",
  },
];

const failures = [];

for (const filePath of walk(sourceRoot)) {
  if (!checkedExtensions.has(extname(filePath))) {
    continue;
  }

  const source = readFileSync(filePath, "utf8");
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const { pattern, reason } of forbiddenPatterns) {
      if (pattern.test(line)) {
        failures.push({
          filePath,
          line: index + 1,
          reason,
          source: line.trim(),
        });
      }
    }
  });
}

if (failures.length > 0) {
  console.error("UI feedback smoke check failed.");
  for (const failure of failures) {
    console.error(
      `- ${relative(process.cwd(), failure.filePath)}:${failure.line} ${failure.reason}`
    );
    console.error(`  ${failure.source}`);
  }
  process.exit(1);
}

console.log("UI feedback smoke check passed.");

function* walk(dirPath) {
  for (const entry of readdirSync(dirPath)) {
    const path = join(dirPath, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      yield* walk(path);
      continue;
    }

    yield path;
  }
}
