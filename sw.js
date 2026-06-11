/**
 * sw.js – Service Worker (PWA オフライン対応)
 */
const CACHE_NAME = 'penano-v0-0-0-dev(8)';

// HTML（ルート）やドキュメント以外の、絶対に変わらない静的アセットのみを事前キャッシュ
const ASSETS = [
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
  const url = new URL(e.request.url);

  // 1. HTMLファイル（トップページ等）や /doc/ 内のファイルは「ネットワーク優先」
  // オフラインの時だけ、過去に取得したキャッシュ（もしあれば）を返す
  if (
    url.pathname === '/' || 
    url.pathname.endsWith('/index.html') || 
    url.pathname.includes('/doc/')
  ) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          // 取得に成功したら、オフライン時のためにキャッシュを更新しておく
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(e.request)) // ネットが死んでいたらキャッシュを返す
    );
    return;
  }

  // 2. その他の静的ファイル（JS, CSS, 画像等）は「キャッシュ優先」
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});