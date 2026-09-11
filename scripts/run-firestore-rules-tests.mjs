import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { delimiter, dirname } from "node:path";

const javaHomeCandidates = [
  "C:\\Program Files\\Android\\Android Studio\\jbr",
  "C:\\Program Files\\Adobe\\Adobe Animate 2024\\jre",
];
const windowsNpxCliPath = "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js";

function hasJavaOnPath() {
  const result = spawnSync("java", ["-version"], {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "ignore",
  });

  return result.status === 0;
}

function resolveBundledJavaHome() {
  return javaHomeCandidates.find((javaHome) =>
    existsSync(`${javaHome}\\bin\\java.exe`)
  );
}

const env = { ...process.env };
env.PATH = `${dirname(process.execPath)}${delimiter}${env.PATH ?? ""}`;

if (!hasJavaOnPath()) {
  const javaHome = resolveBundledJavaHome();

  if (javaHome) {
    env.JAVA_HOME = javaHome;
    env.PATH = `${javaHome}\\bin${delimiter}${env.PATH ?? ""}`;
  }
}

const command =
  process.platform === "win32" && existsSync(windowsNpxCliPath)
    ? process.execPath
    : process.platform === "win32"
      ? "npx.cmd"
      : "npx";
const commandArgs =
  process.platform === "win32" && existsSync(windowsNpxCliPath)
    ? [windowsNpxCliPath]
    : [];

const result = spawnSync(
  command,
  [
    ...commandArgs,
    "-y",
    "firebase-tools@latest",
    "emulators:exec",
    "--only",
    "firestore,database",
    "vitest run tests/firestore.rules.test.ts tests/database.rules.test.ts",
  ],
  {
    env,
    shell: false,
    stdio: "inherit",
  }
);

process.exit(result.status ?? 1);
