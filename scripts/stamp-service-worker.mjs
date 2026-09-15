import { readFile, writeFile } from "node:fs/promises";

const serviceWorkerPath = "dist/sw.js";
const buildId = createBuildId();
const serviceWorker = await readFile(serviceWorkerPath, "utf8");

if (!serviceWorker.includes("__OUR_SHARE_BUILD_ID__")) {
  throw new Error("dist/sw.js is missing the service worker build marker.");
}

await writeFile(
  serviceWorkerPath,
  serviceWorker.replaceAll("__OUR_SHARE_BUILD_ID__", buildId),
  "utf8"
);

console.log(`Stamped service worker cache version: ${buildId}`);

function createBuildId() {
  const commit = process.env.VITE_BUILD_COMMIT?.trim();

  if (commit) {
    return commit.slice(0, 12).replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  const buildTime = process.env.VITE_BUILD_TIME?.trim();

  if (buildTime) {
    return buildTime.replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  return String(Date.now());
}
