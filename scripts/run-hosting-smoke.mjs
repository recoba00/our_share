const baseUrl = process.env.SMOKE_BASE_URL ?? "http://recoba00.dothome.co.kr/our_share";
const expectedCommit = process.env.EXPECTED_COMMIT ?? (await getGitCommit());
const routes = ["/", "/chat", "/poll", "/memo", "/calendar", "/diagnostics"];

const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
const failures = [];

for (const route of routes) {
  const url = `${normalizedBaseUrl}${route}`;
  const response = await fetch(url);
  const body = await response.text();

  if (!response.ok) {
    failures.push(`${url} returned ${response.status}`);
    continue;
  }

  if (!body.includes('<div id="root"></div>')) {
    failures.push(`${url} did not return the Vite app shell`);
  }

  if (!body.includes("/our_share/assets/")) {
    failures.push(`${url} did not include built asset links`);
  }
}

const shellResponse = await fetch(`${normalizedBaseUrl}/diagnostics`);
const shellHtml = await shellResponse.text();
const assetPaths = Array.from(
  shellHtml.matchAll(/(?:src|href)="([^"]*\/our_share\/assets\/[^"]+)"/g),
  (match) => match[1]
);

if (assetPaths.length === 0) {
  failures.push("No built JS/CSS assets found in diagnostics shell");
}

for (const assetPath of assetPaths) {
  const assetUrl = new URL(assetPath, normalizedBaseUrl).toString();
  const response = await fetch(assetUrl);
  const body = await response.text();

  if (!response.ok) {
    failures.push(`${assetUrl} returned ${response.status}`);
    continue;
  }

  if (assetPath.endsWith(".js") && expectedCommit !== "unknown" && !body.includes(expectedCommit)) {
    failures.push(`${assetUrl} does not include expected commit ${expectedCommit}`);
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
console.log(`Expected commit: ${expectedCommit}`);

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
