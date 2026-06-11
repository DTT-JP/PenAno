/**
 * sw.js – Service Worker (PWA オフライン対応)
 */
const CACHE_NAME = 'penano-v0-0-1-dev';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './version.js',
  './storage.js',
  './data.js',
  './canvas.js',
  './app.js',
  './lib/jszip.min.js',
  './lib/marked.min.js',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // doc/*.md はネットワーク優先（バージョンノート更新のため）
  if (e.request.url.includes('/doc/')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
