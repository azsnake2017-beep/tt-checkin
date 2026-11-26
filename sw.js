// sw.js — Service Worker для клуба настольного тенниса Челябинск
var CACHE_NAME = 'tt-chmz-v5';

var STATIC_FILES = [
  './',
  './index.html',
  './style.css',
  './css/style-modern.css',
  './js/config.js',
  './js/app.js',
  './js/radar.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_FILES);
    }).catch(function() {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Network First для HTML/JS/CSS — обновления видны сразу, офлайн работает из кэша
self.addEventListener('fetch', function(event) {
  var url = event.request.url;
  if (event.request.method !== 'GET') return;
  if (url.indexOf('firestore.googleapis.com') !== -1 ||
      url.indexOf('firebase.googleapis.com') !== -1 ||
      url.indexOf('googleapis.com') !== -1 ||
      url.indexOf('telegram.org') !== -1 ||
      url.indexOf('script.google.com') !== -1 ||
      url.indexOf('open-meteo.com') !== -1) {
    return;
  }

  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        if (event.request.headers.get('accept') && event.request.headers.get('accept').indexOf('text/html') !== -1) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
