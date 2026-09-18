// Sesión 17: registro, instalación y activación del Service Worker.
// Sesión 18: el manejador de "fetch" intercepta de verdad — caché primero, red
// si no está. No se escribe nada nuevo al caché durante fetch (las estrategias
// con nombre llegan en la Sesión 20).
//
// Solo se cachean rutas estáticas. "/" y "/pacientes" se renderizan con datos de
// la API: cachearlas dejaría al usuario viendo datos viejos.
//
// El CSS, JS y fuentes de Next llevan hash en el nombre y cambian en cada build:
// `npm run build` genera public/sw-assets.js con esa lista (self.ASSETS_BUILD).
// En desarrollo ese archivo no existe y solo se cachean las rutas de abajo.
try {
  importScripts("/sw-assets.js");
} catch {
  self.ASSETS_BUILD = [];
}

const CACHE_NAME = "historiaviva-v3";
const CORE_ASSETS = [
  "/registro",
  "/pacientes/nuevo",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  ...self.ASSETS_BUILD,
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((encontrado) => encontrado || fetch(event.request)),
  );
});
