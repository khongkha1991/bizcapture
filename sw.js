// BizCapture Service Worker v2
const CACHE = 'bizcapture-v2';
const ASSETS = [
  '/bizcapture/index.html',
  '/bizcapture/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Web Share Target
  if (e.request.method === 'POST') {
    e.respondWith((async () => {
      const data = await e.request.formData();
      const file = data.get('file');
      const text = data.get('text') || data.get('title') || '';
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        if (file) {
          const buf = await file.arrayBuffer();
          client.postMessage({ type: 'share-image', blob: new Blob([buf], { type: file.type }) });
        } else if (text) {
          client.postMessage({ type: 'share-text', text });
        }
      }
      return Response.redirect('/bizcapture/index.html', 303);
    })());
    return;
  }

  // Network first → cache fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/bizcapture/index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(c => c || fetch(e.request))
  );
});
