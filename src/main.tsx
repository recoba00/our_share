import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { ThemeProvider } from "./features/theme/ThemeProvider";
import { registerServiceWorker } from "./lib/pwa/registerServiceWorker";
import "./styles/index.css";

const staleAssetRetryKey = "our-share:stale-asset-retry-at";
const staleAssetRetryWindowMs = 30_000;

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  reloadAfterStaleAsset();
});

window.addEventListener("error", (event) => {
  if (
    event.message.includes("Importing a module script failed") ||
    event.message.includes("Failed to fetch dynamically imported module")
  ) {
    event.preventDefault();
    reloadAfterStaleAsset();
  }
});

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter basename={routerBasename}>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);

registerServiceWorker();

function reloadAfterStaleAsset() {
  const now = Date.now();

  try {
    const lastRetryAt = Number(sessionStorage.getItem(staleAssetRetryKey) ?? 0);

    if (lastRetryAt && now - lastRetryAt < staleAssetRetryWindowMs) {
      return;
    }

    sessionStorage.setItem(staleAssetRetryKey, String(now));
  } catch {
    // 세션 저장소를 사용할 수 없는 환경에서는 한 번만 현재 페이지를 새로고침한다.
  }

  const refreshedUrl = new URL(window.location.href);
  refreshedUrl.searchParams.set("asset-refresh", String(now));
  window.location.replace(refreshedUrl.toString());
}
