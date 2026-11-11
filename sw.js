var CACHE = 'snow-timer-v1';
var FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', function(e){
  // Cache each file independently so one missing/slow file can't
  // block the whole app shell from being available offline.
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(FILES.map(function(url){
        return fetch(url).then(function(res){
          if (res && res.ok) return c.put(url, res);
        }).catch(function(){ /* ignore, will fill in on first real visit */ });
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Network-first: when online, always fetch the latest file and refresh
// the cache. When offline (or the network request fails), fall back to
// whatever was last cached, so the app and its data keep working with
// no connection at all. Navigations fall back to the cached app shell.
self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function(res){
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
      }
      return res;
    }).catch(function(){
      return caches.match(e.request).then(function(cached){
        if (cached) return cached;
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
