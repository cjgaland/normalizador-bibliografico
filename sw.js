const CACHE = 'normalizador-bibliografico-v1.2';
const ASSETS = [
  './',
  './index.html',
  './Normalizador-bibliografico.html',
  './manifest.webmanifest',
  './favicon.png',
  './apple-touch-icon.png',
  './icono-192.png',
  './icono-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
