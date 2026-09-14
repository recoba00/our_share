export function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;

          if (!installingWorker || !navigator.serviceWorker.controller) {
            return;
          }

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed") {
              window.dispatchEvent(new Event("our-share:pwa-update-ready"));
            }
          });
        });
      })
      .catch(() => {
        // PWA registration is optional; the app should still run if it fails.
      });
  });
}
