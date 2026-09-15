export function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: "none" })
      .then((registration) => {
        notifyWhenUpdateIsReady(registration);
        void registration.update();

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;

          if (!installingWorker) {
            return;
          }

          installingWorker.addEventListener("statechange", () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              notifyWhenUpdateIsReady(registration);
            }
          });
        });

        const checkForUpdate = () => {
          if (document.visibilityState === "hidden") {
            return;
          }

          void registration.update();
        };

        window.addEventListener("focus", checkForUpdate);
        window.addEventListener("online", checkForUpdate);
        document.addEventListener("visibilitychange", checkForUpdate);

        window.setInterval(checkForUpdate, 5 * 60 * 1000);
      })
      .catch(() => {
        // PWA registration is optional; the app should still run if it fails.
      });
  });
}

function notifyWhenUpdateIsReady(registration: ServiceWorkerRegistration) {
  if (!registration.waiting || !navigator.serviceWorker.controller) {
    return;
  }

  window.dispatchEvent(new Event("our-share:pwa-update-ready"));
}
