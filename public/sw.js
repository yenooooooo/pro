/**
 * Nexus ERP service worker — 가벼운 캐시 + 오프라인 fallback.
 *
 * 전략:
 *  - 정적 자산 (icon, manifest): cache-first
 *  - 페이지/HTML: network-first (오프라인 시 캐시 fallback)
 *  - API 호출: 캐시 안 함 (실시간 데이터)
 *  - Supabase / Gemini: 캐시 안 함
 */

const CACHE_VERSION = "nexus-v1";
const STATIC_ASSETS = ["/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 캐시 제외 — API/Supabase/외부
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.host !== self.location.host
  ) {
    return;
  }

  // 정적 자산: cache-first
  if (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/icon.svg" ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // 페이지: network-first → fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request)),
    );
  }
});

// 푸시 알림 — 서버에서 보낸 알림을 표시
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Nexus ERP 알림", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Nexus ERP", {
      body: payload.body ?? "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: payload.data ?? {},
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(self.location.host)) {
          c.focus();
          c.navigate(target);
          return;
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
