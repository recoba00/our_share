import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const windowsNpmCliPath =
  "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js";

const checks = [
  ["npm", ["run", "lint"], "Lint"],
  ["npm", ["run", "test:rules"], "Firebase rules"],
  ["npm", ["run", "build"], "Dothome build"],
  ["npm", ["run", "test:dist"], "Dothome dist"],
  ["npm", ["run", "build:firebase"], "Firebase Hosting build"],
  ["npm", ["run", "test:dist:firebase"], "Firebase Hosting dist"],
];

for (const [command, args, label] of checks) {
  console.log(`\n== ${label} ==`);
  const invocation = getCommandInvocation(command, args);

  const result = spawnSync(invocation.command, invocation.args, {
    shell: false,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.error(`\nMVP readiness check failed at: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nMVP readiness check passed.");

function getCommandInvocation(command, args) {
  if (
    process.platform === "win32" &&
    command === "npm" &&
    existsSync(windowsNpmCliPath)
  ) {
    return {
      args: [windowsNpmCliPath, ...args],
      command: process.execPath,
    };
  }

  return {
    args,
    command,
  };
}
