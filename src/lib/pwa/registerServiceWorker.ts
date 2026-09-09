export function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/our_share/sw.js").catch(() => {
      // PWA registration is optional; the app should still run if it fails.
    });
  });
}
