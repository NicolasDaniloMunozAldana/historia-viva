// Espejo de la Sesión 17: registro, instalación y activación del Service Worker.
// El manejador de "fetch" deja pasar la petición a la red tal cual — interceptar
// de verdad y cachear rutas (IndexedDB, Background Sync) llega en sesiones futuras.
const CACHE_NAME = "historiaviva-v1";
const CORE_ASSETS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
