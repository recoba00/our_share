const baseUrl = process.env.SMOKE_BASE_URL ?? "http://recoba00.dothome.co.kr/our_share";
const expectedCommit = process.env.EXPECTED_COMMIT ?? (await getGitCommit());
const retryCount = Number(process.env.SMOKE_RETRIES ?? 0);
const retryDelayMs = Number(process.env.SMOKE_RETRY_DELAY_MS ?? 5000);
const routes = ["/", "/chat", "/poll", "/memo", "/calendar", "/diagnostics"];

const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
const basePath = new URL(normalizedBaseUrl).pathname.replace(/\/$/, "");
const assetPathPrefix = basePath === "" ? "" : basePath;

let failures = [];
let assetPaths = [];
let checkedJsAssets = [];

for (let attempt = 0; attempt <= retryCount; attempt += 1) {
  failures = await runSmokeCheck();

  if (failures.length === 0) {
    break;
  }

  if (attempt < retryCount) {
    console.log(
      `Hosting smoke check attempt ${attempt + 1} failed. Retrying in ${retryDelayMs}ms...`
    );
    await delay(retryDelayMs);
  }
}

if (failures.length > 0) {
  console.error("Hosting smoke check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Hosting smoke check passed.");
console.log(`Base URL: ${normalizedBaseUrl}`);
console.log(`Routes: ${routes.join(", ")}`);
console.log(`Assets: ${assetPaths.length}`);
console.log(`JS assets checked: ${checkedJsAssets.length}`);
console.log(`Expected commit: ${expectedCommit}`);

async function runSmokeCheck() {
  const nextFailures = [];

  for (const route of routes) {
    const url = `${normalizedBaseUrl}${route}`;
    const response = await fetch(url);
    const body = await response.text();

    if (!response.ok) {
      nextFailures.push(`${url} returned ${response.status}`);
      continue;
    }

    if (!body.includes('<div id="root"></div>')) {
      nextFailures.push(`${url} did not return the Vite app shell`);
    }

    if (!body.includes(`${assetPathPrefix}/assets/`)) {
      nextFailures.push(`${url} did not include built asset links`);
    }
  }

  const shellResponse = await fetch(`${normalizedBaseUrl}/diagnostics`);
  const shellHtml = await shellResponse.text();
  assetPaths = Array.from(
    shellHtml.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g),
    (match) => match[1]
  );

  if (assetPaths.length === 0) {
    nextFailures.push("No built JS/CSS assets found in diagnostics shell");
  }

  const jsAssetPaths = new Set(
    assetPaths.filter((assetPath) => assetPath.endsWith(".js"))
  );
  const fetchedJsBodies = new Map();

  for (const assetPath of assetPaths) {
    const assetUrl = new URL(assetPath, normalizedBaseUrl).toString();
    const response = await fetch(assetUrl);
    const body = await response.text();

    if (!response.ok) {
      nextFailures.push(`${assetUrl} returned ${response.status}`);
      continue;
    }

    if (assetPath.endsWith(".js")) {
      fetchedJsBodies.set(assetPath, body);

      for (const referencedAssetPath of findReferencedJsAssets(body)) {
        jsAssetPaths.add(referencedAssetPath);
      }
    }
  }

  for (const assetPath of jsAssetPaths) {
    if (fetchedJsBodies.has(assetPath)) {
      continue;
    }

    const assetUrl = new URL(assetPath, normalizedBaseUrl).toString();
    const response = await fetch(assetUrl);
    const body = await response.text();

    if (!response.ok) {
      nextFailures.push(`${assetUrl} returned ${response.status}`);
      continue;
    }

    fetchedJsBodies.set(assetPath, body);
  }

  checkedJsAssets = [...jsAssetPaths];

  if (
    expectedCommit !== "unknown" &&
    checkedJsAssets.length > 0 &&
    ![...fetchedJsBodies.values()].some((body) => body.includes(expectedCommit))
  ) {
    nextFailures.push(
      `No deployed JS asset includes expected commit ${expectedCommit}`
    );
  }

  return nextFailures;
}

async function getGitCommit() {
  try {
    const { execFileSync } = await import("node:child_process");
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function findReferencedJsAssets(body) {
  const matches = body.matchAll(
    /["'`]((?:\/[^"'`]+\/)?assets\/[^"'`]+\.js|\.\/[^"'`]+\.js)["'`]/g
  );

  return Array.from(matches, (match) => {
    const assetPath = match[1];

    if (assetPath.startsWith("/")) {
      return assetPath;
    }

    if (assetPath.startsWith("./")) {
      return `${assetPathPrefix}/assets/${assetPath.slice(2)}`;
    }

    return `${assetPathPrefix}/${assetPath}`;
  });
}
