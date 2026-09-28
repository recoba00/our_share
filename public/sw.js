// This marker is replaced with the build commit/time in dist during every production build.
const CACHE_NAME = "our-share-__OUR_SHARE_BUILD_ID__";
const SCOPE_PATH = new URL(self.registration.scope).pathname;
const APP_SHELL = [
  SCOPE_PATH,
  `${SCOPE_PATH}index.html`,
  `${SCOPE_PATH}manifest.webmanifest`,
  `${SCOPE_PATH}pwa-icon.svg`,
  `${SCOPE_PATH}pwa-icon-192.png`,
  `${SCOPE_PATH}pwa-icon-512.png`
];

let firebaseMessaging = null;

try {
  importScripts(
    "https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js"
  );
  firebase.initializeApp({
    apiKey: "AIzaSyCY9-04RVkdOzSZRYJDJbAZBArmVIERdt0",
    appId: "1:297070610466:web:d0be0b8666ee690431a27b",
    authDomain: "our-share-6baf5.firebaseapp.com",
    messagingSenderId: "297070610466",
    projectId: "our-share-6baf5"
  });
  firebaseMessaging = firebase.messaging();
} catch (error) {
  console.warn("Firebase Messaging service worker initialization failed", error);
}

firebaseMessaging?.onBackgroundMessage((payload) => {
  if (payload.notification) {
    return;
  }

  const title = payload.data?.title || "우리끼리";
  const url = payload.data?.url || SCOPE_PATH;

  self.registration.showNotification(title, {
    badge: `${SCOPE_PATH}pwa-icon-192.png`,
    body: payload.data?.body || "새 소식이 도착했어요.",
    data: { url },
    icon: `${SCOPE_PATH}pwa-icon-192.png`,
    tag: payload.data?.tag || "our-share-update"
  });
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

self.addEventListener("notificationclick", (event) => {
  const notificationUrl = event.notification.data?.url;

  if (!notificationUrl) {
    return;
  }

  event.notification.close();

  const targetUrl = new URL(notificationUrl, self.location.origin);

  if (targetUrl.origin !== self.location.origin) {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      const targetClient = clients.find((client) => new URL(client.url).origin === targetUrl.origin);

      if (targetClient) {
        return targetClient.focus().then((client) => {
          client.postMessage({ type: "NAVIGATE", url: targetUrl.pathname + targetUrl.search });
          return client;
        });
      }

      return self.clients.openWindow(targetUrl.href);
    })
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(`${SCOPE_PATH}index.html`))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (
          networkResponse.ok &&
          new URL(request.url).origin === self.location.origin
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }

        return networkResponse;
      });
    })
  );
});
