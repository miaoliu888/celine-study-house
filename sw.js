/* ============================================================
   sw.js — celine 的蓝兔学习屋 · Service Worker
   缓存策略：precache 关键资源 + runtime cache-first
   ============================================================ */

const CACHE_NAME = 'siven-house-v1';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/pwa-icon.svg',
  './assets/pwa-icon-maskable.svg',
  './css/tokens.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/pages.css',
  './js/main.js',
  './js/store.js',
  './js/utils.js',
  './js/bunny.js',
  './js/ket-db.js',
  './js/tts.js',
  './js/scheduler.js',
  './js/review.js',
  './js/tasks.js',
  './js/timer.js',
  './js/router.js',
  './js/views/desktop.js',
  './js/views/plan.js',
  './js/views/english.js',
  './js/views/dictation.js',
  './js/views/wrong-words.js',
  './js/views/vocab.js',
  './js/views/english-stats.js',
  './js/views/focus.js',
  './js/views/summary.js',
  './js/views/calendar.js',
  './js/views/growth.js',
  './js/views/money.js',
  './js/views/settings.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        // 个别资源失败不阻塞 SW
        console.warn('[SW] precache 部分失败：', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 只处理同源
  if (url.origin !== self.location.origin) return;

  // 跨文档类型（Google Fonts 等 CDN）：network-first，回退到 cache
  if (url.host !== self.location.host) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // 导航请求：cache-first
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(req).then((cached) => {
        return cached || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // 其他资源：cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
