import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { delimiter, dirname } from "node:path";

const javaHomeCandidates = [
  "C:\\Program Files\\Android\\Android Studio\\jbr",
  "C:\\Program Files\\Adobe\\Adobe Animate 2024\\jre",
];
const windowsNpmCliPath = "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js";
const windowsNpxCliPath = "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js";

function withJavaEnvironment() {
  const env = { ...process.env };
  env.PATH = `${dirname(process.execPath)}${delimiter}${env.PATH ?? ""}`;
  const javaAvailable = spawnSync("java", ["-version"], {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "ignore",
  }).status === 0;

  if (!javaAvailable) {
    const javaHome = javaHomeCandidates.find((candidate) =>
      existsSync(`${candidate}\\bin\\java.exe`)
    );

    if (javaHome) {
      env.JAVA_HOME = javaHome;
      env.PATH = `${javaHome}\\bin${delimiter}${env.PATH ?? ""}`;
    }
  }

  return env;
}

const env = withJavaEnvironment();
const npmCommand =
  process.platform === "win32" && existsSync(windowsNpmCliPath)
    ? process.execPath
    : process.platform === "win32"
      ? "npm.cmd"
      : "npm";
const npmArgs =
  process.platform === "win32" && existsSync(windowsNpmCliPath)
    ? [windowsNpmCliPath]
    : [];
const npmResult = spawnSync(
  npmCommand,
  [...npmArgs, "--prefix", "functions", "run", "build"],
  { env, shell: false, stdio: "inherit" }
);

if (npmResult.status !== 0) {
  process.exit(npmResult.status ?? 1);
}

const firebaseCommand =
  process.platform === "win32" && existsSync(windowsNpxCliPath)
    ? process.execPath
    : process.platform === "win32"
      ? "npx.cmd"
      : "npx";
const firebaseArgs =
  process.platform === "win32" && existsSync(windowsNpxCliPath)
    ? [windowsNpxCliPath]
    : [];

const result = spawnSync(
  firebaseCommand,
  [
    ...firebaseArgs,
    "-y",
    "firebase-tools@latest",
    "emulators:exec",
    "--only",
    "functions,firestore,database",
    "npm --prefix functions run test:emulator",
  ],
  { env, shell: false, stdio: "inherit" }
);

process.exit(result.status ?? 1);
