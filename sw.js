const CACHE = 'normalizador-bibliografico-v1.9';
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

// skipWaiting: un service worker nuevo toma el relevo de inmediato, sin
// quedarse "esperando" a que se cierren todas las ventanas. Sin esto, un
// worker en espera se queda atascado para siempre y no hay forma de
// activarlo desde la página (era la causa del aviso de actualización que
// no se iba). Es seguro porque el HTML ya va primero a la red.
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
// El HTML va SIEMPRE primero a la red: así un despliegue nuevo se ve al
// abrir la app, sin depender de que se active un service worker nuevo.
// Si no hay conexión, se cae a la copia guardada. El resto (iconos,
// manifest) sí va primero de caché, que no cambia entre versiones.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const isDoc = req.mode === 'navigate' || req.destination === 'document';
  if (isDoc) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(cache => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match('./Normalizador-bibliografico.html')))
    );
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
