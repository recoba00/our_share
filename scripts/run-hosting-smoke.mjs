const baseUrl = process.env.SMOKE_BASE_URL ?? "http://recoba00.dothome.co.kr/our_share";
const expectedCommit = process.env.EXPECTED_COMMIT ?? (await getGitCommit());
const retryCount = Number(process.env.SMOKE_RETRIES ?? 0);
const retryDelayMs = Number(process.env.SMOKE_RETRY_DELAY_MS ?? 5000);
const routes = ["/", "/chat", "/poll", "/memo", "/calendar", "/diagnostics"];

const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

let failures = [];
let assetPaths = [];

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

    if (!body.includes("/our_share/assets/")) {
      nextFailures.push(`${url} did not include built asset links`);
    }
  }

  const shellResponse = await fetch(`${normalizedBaseUrl}/diagnostics`);
  const shellHtml = await shellResponse.text();
  assetPaths = Array.from(
    shellHtml.matchAll(/(?:src|href)="([^"]*\/our_share\/assets\/[^"]+)"/g),
    (match) => match[1]
  );

  if (assetPaths.length === 0) {
    nextFailures.push("No built JS/CSS assets found in diagnostics shell");
  }

  for (const assetPath of assetPaths) {
    const assetUrl = new URL(assetPath, normalizedBaseUrl).toString();
    const response = await fetch(assetUrl);
    const body = await response.text();

    if (!response.ok) {
      nextFailures.push(`${assetUrl} returned ${response.status}`);
      continue;
    }

    if (
      assetPath.endsWith(".js") &&
      expectedCommit !== "unknown" &&
      !body.includes(expectedCommit)
    ) {
      nextFailures.push(`${assetUrl} does not include expected commit ${expectedCommit}`);
    }
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
