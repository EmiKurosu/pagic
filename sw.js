/* offline support: network first (so an update is picked up when online), the saved copy when there is no connection */
var CACHE = 'fumekuri-shell', SHELL = new URL('./__shell', self.location.href).href;
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url); if (u.origin !== location.origin) return;
  if (u.search.indexOf('chk=') >= 0) return;            // the version check must see the network
  var nav = r.mode === 'navigate';
  e.respondWith(fetch(nav ? new Request(r, { cache: 'reload' }) : r).then(function (res) {
    if (res && res.ok && !res.redirected) { var c1 = res.clone(), c2 = res.clone(); caches.open(CACHE).then(function (ca) { if (nav) { ca.put(SHELL, c1); ca.put(u.origin + u.pathname, c2); } else ca.put(r, c1); }); }
    return res;
  }).catch(function () {
    return caches.open(CACHE).then(function (ca) {
      return (nav ? ca.match(u.origin + u.pathname).then(function (m) { return m || ca.match(SHELL); }) : ca.match(r, { ignoreSearch: true })).then(function (m) { return m || new Response('offline', { status: 503 }); });
    });
  }));
});
