const baseUrl = process.env.SMOKE_BASE_URL ?? "https://our-share-6baf5.web.app";
const expectedCommit = process.env.EXPECTED_COMMIT ?? (await getGitCommit());
const retryCount = Number(process.env.SMOKE_RETRIES ?? 0);
const retryDelayMs = Number(process.env.SMOKE_RETRY_DELAY_MS ?? 5000);
const routes = [
  "/",
  "/chat",
  "/chat/smoke-room",
  "/poll",
  "/memo",
  "/calendar",
  "/diagnostics",
  "/profile",
  "/settings",
  "/admin",
  "/invite/ABC123",
];

const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
const basePath = new URL(normalizedBaseUrl).pathname.replace(/\/$/, "");
const assetPathPrefix = basePath === "" ? "" : basePath;

let failures = [];
let assetPaths = [];
let checkedJsAssets = [];
let checkedPublicAssets = [];

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
console.log(`Public assets checked: ${checkedPublicAssets.length}`);
console.log(`Expected commit: ${expectedCommit}`);

async function runSmokeCheck() {
  const nextFailures = [];
  let shellResponse;
  let shellHtml = "";

  for (const route of routes) {
    const url = `${normalizedBaseUrl}${route}`;
    const response = await fetch(url);
    const body = await response.text();

    if (route === "/diagnostics") {
      shellResponse = response;
      shellHtml = body;
    }

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

  if (!shellResponse) {
    shellResponse = await fetch(`${normalizedBaseUrl}/diagnostics`);
    shellHtml = await shellResponse.text();
  }

  validateSecurityHeaders(shellResponse.headers, nextFailures);

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

    if (assetPath.includes("/assets/")) {
      validateImmutableCacheHeader(response.headers, assetUrl, nextFailures);
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

  await validatePublicAssets(nextFailures);

  return nextFailures;
}

async function validatePublicAssets(nextFailures) {
  const publicAssets = [
    ["manifest.webmanifest", "manifest"],
    ["sw.js", "javascript"],
    ["pwa-icon-192.png", "image/png"],
    ["pwa-icon-512.png", "image/png"],
    ["og-image.png", "image/png"],
  ];

  checkedPublicAssets = [];

  for (const [assetPath, expectedType] of publicAssets) {
    const assetUrl = `${normalizedBaseUrl}/${assetPath}`;
    const response = await fetch(assetUrl, { cache: "no-store" });

    if (!response.ok) {
      nextFailures.push(`${assetUrl} returned ${response.status}`);
      continue;
    }

    checkedPublicAssets.push(assetPath);
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes(expectedType)) {
      nextFailures.push(
        `${assetUrl} returned unexpected content type ${contentType || "missing"}`
      );
    }

    if (assetPath === "manifest.webmanifest") {
      await validateManifestResponse(response, assetUrl, nextFailures);
      validateNoCacheHeader(response.headers, assetUrl, nextFailures);
      continue;
    }

    if (assetPath === "sw.js") {
      const body = await response.text();

      if (body.includes("__OUR_SHARE_BUILD_ID__")) {
        nextFailures.push(`${assetUrl} contains an unstamped build marker`);
      }

      validateNoCacheHeader(response.headers, assetUrl, nextFailures);
      continue;
    }

    await response.arrayBuffer();
  }
}

async function validateManifestResponse(response, assetUrl, nextFailures) {
  let manifest;

  try {
    manifest = await response.json();
  } catch {
    nextFailures.push(`${assetUrl} is not valid JSON`);
    return;
  }

  if (manifest.name !== "우리끼리" || manifest.short_name !== "우리끼리") {
    nextFailures.push(`${assetUrl} has an unexpected app name`);
  }

  if (manifest.start_url !== "." || manifest.scope !== ".") {
    nextFailures.push(`${assetUrl} start_url and scope must stay relative`);
  }

  if (manifest.display !== "standalone") {
    nextFailures.push(`${assetUrl} display must be standalone`);
  }

  const iconSizes = new Set(
    (manifest.icons ?? []).map((icon) => `${icon.sizes}:${icon.type}`)
  );

  for (const requiredIcon of ["192x192:image/png", "512x512:image/png"]) {
    if (!iconSizes.has(requiredIcon)) {
      nextFailures.push(`${assetUrl} is missing ${requiredIcon}`);
    }
  }
}

function validateSecurityHeaders(headers, nextFailures) {
  const expectedHeaders = [
    ["x-content-type-options", "nosniff"],
    ["referrer-policy", "strict-origin-when-cross-origin"],
    ["x-frame-options", "DENY"],
  ];

  for (const [name, expectedValue] of expectedHeaders) {
    const actualValue = headers.get(name);

    if (actualValue?.toLowerCase() !== expectedValue.toLowerCase()) {
      nextFailures.push(
        `Hosting header ${name} should be ${expectedValue}, received ${actualValue ?? "missing"}`
      );
    }
  }

  const permissionsPolicy = headers.get("permissions-policy") ?? "";

  for (const directive of ["geolocation=(self)", "camera=()", "microphone=()"]) {
    if (!permissionsPolicy.includes(directive)) {
      nextFailures.push(`Permissions-Policy is missing ${directive}`);
    }
  }
}

function validateImmutableCacheHeader(headers, url, nextFailures) {
  const cacheControl = headers.get("cache-control") ?? "";

  if (!cacheControl.includes("immutable")) {
    nextFailures.push(`${url} is missing immutable cache control`);
  }
}

function validateNoCacheHeader(headers, url, nextFailures) {
  const cacheControl = headers.get("cache-control") ?? "";

  if (!cacheControl.includes("no-cache") || !cacheControl.includes("no-store")) {
    nextFailures.push(`${url} is missing no-cache, no-store cache control`);
  }
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
