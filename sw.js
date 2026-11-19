/* offline support + fast start: the app opens at once from the saved copy and the newest file is fetched in the background (the app itself notices a newer version and reloads to it); a reload with ?fresh= and everything else goes to the network first */
var CACHE = 'fumekuri-shell', SHELL = new URL('./__shell', self.location.href).href;
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url); if (u.origin !== location.origin) return;
  if (u.search.indexOf('chk=') >= 0) return;            // the version check must see the network
  var nav = r.mode === 'navigate';
  if (nav && u.search.indexOf('fresh=') < 0) {          // start: the saved copy at once, the network only refreshes it for the next start
    e.respondWith(caches.open(CACHE).then(function (ca) {
      var net = fetch(new Request(r, { cache: 'reload' })).then(function (res) {
        if (res && res.ok && !res.redirected) { ca.put(SHELL, res.clone()); ca.put(u.origin + u.pathname, res.clone()); }
        return res;
      });
      return ca.match(u.origin + u.pathname).then(function (m) { return m || ca.match(SHELL); }).then(function (m) {
        if (m) { e.waitUntil(net.catch(function () {})); return m; }
        return net.catch(function () { return new Response('offline', { status: 503 }); });
      });
    }));
    return;
  }
  e.respondWith(fetch(nav ? new Request(r, { cache: 'reload' }) : r).then(function (res) {
    if (res && res.ok && !res.redirected) { var c1 = res.clone(), c2 = res.clone(); caches.open(CACHE).then(function (ca) { if (nav) { ca.put(SHELL, c1); ca.put(u.origin + u.pathname, c2); } else ca.put(r, c1); }); }
    return res;
  }).catch(function () {
    return caches.open(CACHE).then(function (ca) {
      return (nav ? ca.match(u.origin + u.pathname).then(function (m) { return m || ca.match(SHELL); }) : ca.match(r, { ignoreSearch: true })).then(function (m) { return m || new Response('offline', { status: 503 }); });
    });
  }));
});
