import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const expectedBasePath = normalizeBasePath(
  getArgValue("--base") ?? process.env.EXPECTED_BASE_PATH ?? "/our_share/"
);
const distDir = "dist";
const indexPath = join(distDir, "index.html");
const failures = [];

if (!existsSync(indexPath)) {
  failures.push("dist/index.html does not exist. Run a build first.");
} else {
  const html = readFileSync(indexPath, "utf8");
  const expectedAssetPrefix =
    expectedBasePath === "/" ? "/assets/" : `${expectedBasePath}assets/`;
  const referencedAssets = Array.from(
    html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g),
    (match) => match[1]
  );

  if (!html.includes('<div id="root"></div>')) {
    failures.push("dist/index.html does not contain the app root.");
  }

  if (html.includes("/src/main.tsx")) {
    failures.push("dist/index.html still references the Vite dev entry.");
  }

  if (!html.includes(expectedAssetPrefix)) {
    failures.push(
      `dist/index.html does not reference assets with ${expectedAssetPrefix}.`
    );
  }

  if (hasWrongAssetPrefix(referencedAssets, expectedBasePath)) {
    failures.push(
      `dist/index.html contains asset paths outside ${expectedAssetPrefix}.`
    );
  }

  if (referencedAssets.length === 0) {
    failures.push("dist/index.html does not reference built assets.");
  }

  validateIndexMetadata(html);

  for (const assetPath of referencedAssets) {
    const filePath = toDistFilePath(assetPath);

    if (!existsSync(filePath)) {
      failures.push(`Referenced asset is missing from dist: ${assetPath}`);
    }
  }
}

validateDistFile("manifest.webmanifest");
validateDistFile("sw.js");
validateDistFile("pwa-icon.svg");
validateDistFile("pwa-icon-192.png");
validateDistFile("pwa-icon-512.png");
validateDistFile("og-image.png");
validateAssetsDirectory();
validateManifest();
validateServiceWorker();
validatePngDimensions("pwa-icon-192.png", 192, 192);
validatePngDimensions("pwa-icon-512.png", 512, 512);
validatePngDimensions("og-image.png", 1200, 630);

if (failures.length > 0) {
  console.error("Dist smoke check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Dist smoke check passed.");
console.log(`Expected base path: ${expectedBasePath}`);

function validateDistFile(fileName) {
  if (!existsSync(join(distDir, fileName))) {
    failures.push(`dist/${fileName} does not exist.`);
  }
}

function validateAssetsDirectory() {
  const assetsDir = join(distDir, "assets");

  if (!existsSync(assetsDir)) {
    failures.push("dist/assets does not exist.");
    return;
  }

  const assets = readdirSync(assetsDir);

  if (!assets.some((asset) => asset.endsWith(".js"))) {
    failures.push("dist/assets does not contain JS assets.");
  }

  if (!assets.some((asset) => asset.endsWith(".css"))) {
    failures.push("dist/assets does not contain CSS assets.");
  }
}

function validateManifest() {
  const manifestPath = join(distDir, "manifest.webmanifest");

  if (!existsSync(manifestPath)) {
    return;
  }

  let manifest;

  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    failures.push("manifest.webmanifest is not valid JSON.");
    return;
  }

  if (manifest.name !== "우리끼리" || manifest.short_name !== "우리끼리") {
    failures.push("manifest app name should be 우리끼리.");
  }

  if (manifest.start_url !== "." || manifest.scope !== ".") {
    failures.push("manifest start_url and scope should stay relative.");
  }

  if (
    manifest.icons?.some((icon) => String(icon.src).startsWith("/our_share/"))
  ) {
    failures.push("manifest icons should not hardcode /our_share/.");
  }

  if (manifest.display !== "standalone") {
    failures.push("manifest display should be standalone.");
  }

  const iconSizes = new Set(
    (manifest.icons ?? []).map((icon) => `${icon.sizes}:${icon.type}`)
  );

  for (const requiredIcon of ["192x192:image/png", "512x512:image/png"]) {
    if (!iconSizes.has(requiredIcon)) {
      failures.push(`manifest is missing ${requiredIcon}.`);
    }
  }
}

function validateIndexMetadata(html) {
  const requiredMetadata = [
    '<title>우리끼리</title>',
    'property="og:site_name" content="우리끼리"',
    'property="og:image:width" content="1200"',
    'property="og:image:height" content="630"',
    'name="twitter:card" content="summary_large_image"',
  ];

  for (const metadata of requiredMetadata) {
    if (!html.includes(metadata)) {
      failures.push(`dist/index.html is missing metadata: ${metadata}`);
    }
  }
}

function validatePngDimensions(fileName, expectedWidth, expectedHeight) {
  const filePath = join(distDir, fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const image = readFileSync(filePath);
  const pngSignature = "89504e470d0a1a0a";

  if (image.length < 24 || image.subarray(0, 8).toString("hex") !== pngSignature) {
    failures.push(`dist/${fileName} is not a valid PNG.`);
    return;
  }

  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);

  if (width !== expectedWidth || height !== expectedHeight) {
    failures.push(
      `dist/${fileName} should be ${expectedWidth}x${expectedHeight}, received ${width}x${height}.`
    );
  }
}

function validateServiceWorker() {
  const serviceWorkerPath = join(distDir, "sw.js");

  if (!existsSync(serviceWorkerPath)) {
    return;
  }

  const serviceWorker = readFileSync(serviceWorkerPath, "utf8");

  if (serviceWorker.includes("/our_share/")) {
    failures.push("service worker should not hardcode /our_share/.");
  }

  if (serviceWorker.includes("__OUR_SHARE_BUILD_ID__")) {
    failures.push("service worker build marker was not stamped.");
  }
}

function toDistFilePath(assetPath) {
  const assetIndex = assetPath.indexOf("/assets/");
  const relativePath = assetPath.slice(assetIndex + 1);
  return join(distDir, ...relativePath.split("/"));
}

function hasWrongAssetPrefix(referencedAssets, expectedBasePath) {
  if (expectedBasePath === "/") {
    return referencedAssets.some((assetPath) =>
      assetPath.startsWith("/our_share/assets/")
    );
  }

  return referencedAssets.some((assetPath) => assetPath.startsWith("/assets/"));
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg?.slice(name.length + 1);
}

function normalizeBasePath(basePath) {
  if (basePath === "/" || basePath === "") {
    return "/";
  }

  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}
