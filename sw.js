const CACHE = 'marchat-v3';
const CORE = [
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE.filter(Boolean))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('jsdelivr.net')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && e.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});

// ── Web Push: Nachricht vom Server empfangen ──────────────────────────────────
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'MarChat', {
      body: data.body || 'Neue Nachricht',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.conv_id || 'marchat-msg',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || '/index.html', conv_id: data.conv_id }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) { c.focus(); return; }
      }
      return clients.openWindow(e.notification.data?.url || '/index.html');
    })
  );
});
