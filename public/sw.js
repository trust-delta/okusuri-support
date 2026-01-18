// Service Worker for PWA and Push Notifications
// Version: 1.1.0 - Added notification actions support

const CACHE_NAME = "okusuri-support-v1";
const STATIC_CACHE_URLS = ["/", "/manifest.json"];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Install event");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching static assets");
      return cache.addAll(STATIC_CACHE_URLS);
    }),
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activate event");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        }),
      );
    }),
  );
  // Claim all clients immediately
  return self.clients.claim();
});

// Fetch event - Network First strategy
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip chrome extensions and other non-http(s) requests
  if (!event.request.url.startsWith("http")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(event.request);
      }),
  );
});

// Push event - handle push notifications
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push event received");

  let notificationData = {
    title: "おくすりサポート",
    body: "新しい通知があります",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    tag: "default",
    data: {},
    actions: [],
  };

  // Parse push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        ...notificationData,
        ...payload,
      };
    } catch (error) {
      console.error("[Service Worker] Error parsing push data:", error);
    }
  }

  // Build notification options
  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  // Add actions if provided
  if (notificationData.actions && notificationData.actions.length > 0) {
    notificationOptions.actions = notificationData.actions;
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    notificationOptions,
  );

  event.waitUntil(promiseChain);
});

// Notification click event - handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[Service Worker] Notification click event");
  console.log("[Service Worker] Action:", event.action);

  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;
  const recordId = notificationData.recordId;

  // Handle action buttons
  if (action && recordId) {
    if (action === "taken") {
      // Open app with action parameter to mark as taken
      const urlToOpen = `/?action=taken&recordId=${recordId}`;
      event.waitUntil(openOrFocusWindow(urlToOpen));
      return;
    }

    if (action === "snooze") {
      // Open app with action parameter to snooze (default 10 minutes)
      const urlToOpen = `/?action=snooze&recordId=${recordId}&minutes=10`;
      event.waitUntil(openOrFocusWindow(urlToOpen));
      return;
    }
  }

  // Default behavior: open the URL from notification data
  const urlToOpen = notificationData.url || "/";
  event.waitUntil(openOrFocusWindow(urlToOpen));
});

// Helper function to open or focus window
async function openOrFocusWindow(url) {
  const clientList = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  // Try to find an existing window to focus
  for (const client of clientList) {
    // Check if there's already a window open on the same origin
    if (
      new URL(client.url).origin === self.location.origin &&
      "focus" in client
    ) {
      await client.focus();
      // Navigate to the target URL
      await client.navigate(url);
      return;
    }
  }

  // If not, open a new window/tab
  if (clients.openWindow) {
    return clients.openWindow(url);
  }
}
