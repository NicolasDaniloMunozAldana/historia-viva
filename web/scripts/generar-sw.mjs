// Corre después de `next build`: Workbox (GenerateSW) lee los archivos REALES de .next/static,
// con su hash en el nombre, y escribe public/sw.js con la lista de precaché ya resuelta.
// Es la respuesta a la limitación de escribir la lista a mano (Sesión 23/34).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSW } from "workbox-build";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildId = fs.readFileSync(path.join(raiz, ".next", "BUILD_ID"), "utf8").trim();
const MES = 30 * 24 * 60 * 60;

generateSW({
  swDest: path.join(raiz, "public", "sw.js"),
  globDirectory: path.join(raiz, ".next", "static"),
  globPatterns: ["**/*.{js,css,woff,woff2}"],
  // Los archivos de .next/static se sirven bajo /_next/static/.
  modifyURLPrefix: { "": "/_next/static/" },
  // Next ya pone el hash en el nombre: no hace falta calcular otro (revision: null).
  dontCacheBustURLsMatching: /^\/_next\/static\//,
  additionalManifestEntries: [
    { url: "/registro", revision: buildId },
    { url: "/pacientes/nuevo", revision: buildId },
    { url: "/manifest.webmanifest", revision: buildId },
    { url: "/sw-sync.js", revision: buildId },
    { url: "/icons/icon-192.png", revision: buildId },
    { url: "/icons/icon-512.png", revision: buildId },
    { url: "/icons/icon-512-maskable.png", revision: buildId },
  ],
  // Background Sync: el evento «sync» lo atiende public/sw-sync.js (Workbox no lo genera).
  importScripts: ["/sw-sync.js"],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  // Las 3 rutas de la Sesión 21, ahora declarativas. El orden importa: gana la primera que coincida.
  runtimeCaching: [
    {
      // Íconos: inmutables -> Cache First, con expiración real (el manual nunca expiraba nada).
      urlPattern: ({ url }) => url.pathname.startsWith("/icons/"),
      handler: "CacheFirst",
      options: {
        cacheName: "imagenes",
        expiration: { maxEntries: 60, maxAgeSeconds: MES },
      },
    },
    {
      // Datos clínicos: deben verse al día -> Network First, con el último valor como respaldo.
      urlPattern: ({ url, request }) => url.pathname.startsWith("/api/") && request.method === "GET",
      handler: "NetworkFirst",
      options: {
        cacheName: "api-historiaviva",
        networkTimeoutSeconds: 4,
        expiration: { maxEntries: 50, maxAgeSeconds: MES },
      },
    },
    {
      // Shell de Next (HTML y payloads RSC de la navegación) -> Stale-While-Revalidate.
      // maxEntries evita que se acumulen las variantes ?_rsc= de cada prefetch.
      urlPattern: ({ url, request, sameOrigin }) =>
        sameOrigin && request.method === "GET" && !url.pathname.startsWith("/_next/static/"),
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "shell",
        expiration: { maxEntries: 60, maxAgeSeconds: MES },
      },
    },
  ],
}).then(({ count, size, warnings }) => {
  warnings.forEach((w) => console.warn("  aviso:", w));
  console.log(`Service Worker de Workbox generado: precachea ${count} URLs, ${(size / 1024).toFixed(1)} KiB.`);
});
