# HistoriaViva

**Producto** para el personal de salud que hace visitas domiciliarias: registra **signos vitales y medicación sin depender de Internet** y se sincroniza solo cuando vuelve la señal. Electiva III · Progressive Web Apps (UPTC). Equipo: Mileth y Nicolás.

## Qué incluye esta versión final

| Propuesto en el semestre | Estado | Dónde |
|---|---|---|
| App instalable (manifest, iconos, standalone) | ✅ | `web/src/app/manifest.ts`, `components/InstalarApp.tsx` |
| Funciona sin conexión (Service Worker con Workbox, 3 estrategias de caché por tipo de recurso) | ✅ | `web/scripts/generar-sw.mjs` |
| Registro local en IndexedDB (cola de pendientes, notas, evidencias) | ✅ | `web/src/lib/db.ts` |
| **Sincronización automática: Background Sync**, aunque la app esté cerrada (plan B: al abrir y al evento `online`) | ✅ nuevo | `web/public/sw-sync.js`, `web/src/lib/sync.ts` |
| **Reglas contra duplicados y conflictos**: historial que solo crece; un reenvío (mismo `idCliente`) no duplica; dos cuidadores conservan ambos registros | ✅ nuevo | `api/src/pacientes/pacientes.service.ts` (+ pruebas) |
| Evidencia fotográfica con la cámara y ubicación | ✅ | `web/src/components/CapturaEvidencia.tsx` |
| **La evidencia se sube al servidor al sincronizar** (y se ve desde otro dispositivo) | ✅ nuevo | `PUT /api/registros/:id/evidencia` |
| Cifrado de los datos clínicos en el dispositivo (PBKDF2 + AES-GCM) | ✅ | `web/src/lib/crypto.ts`, `notasPrivadas.ts` |
| **Sesión temporal**: las notas se bloquean solas a los 5 min sin actividad o al salir de la app | ✅ nuevo | `web/src/lib/notasPrivadas.ts` |
| Sensores (sacudida / inclinación) y estado de conexión | ✅ | `web/src/lib/sensores.ts`, `EstadoConexion.tsx` |
| El servidor conserva los datos al reiniciarse (archivo JSON) | ✅ nuevo | `api/data/historiaviva.json` |
| Notificaciones push desde el servidor y panel de seguimiento | ⏭ trabajo futuro (se dijo en la sustentación) | — |

Limitación asumida: una app web **no puede programar alertas con la app cerrada y sin conexión**; por eso las notificaciones push quedan como paso futuro en lugar de prometer algo que la plataforma no garantiza.

## Arquitectura
```
Dispositivo (PWA · Next.js 16 + React 19)          Servidor del centro de salud (NestJS 12)
  Service Worker (Workbox + sw-sync.js)  ──sync──▶   /api/pacientes, /api/registros
  IndexedDB: pendientes · notas · evidencias         archivo JSON persistente
```

## Cómo ejecutarlo
Requiere Node 22+. En dos terminales:
```
cd api && npm install && npm run build && npm run start:prod    # http://localhost:3001/api
cd web && npm install && npm run build && npm start             # http://localhost:3000
```
Abrir http://localhost:3000, instalar la app, y probar: DevTools → Network → *Offline*, registrar signos vitales (queda en «Pendientes»), volver a *Online*: se envían solos.

Pruebas del servidor: `cd api && npm test`.

## Probar el flujo offline → sincronización
1. Abrir `/registro`, elegir un paciente y llenar el formulario.
2. Poner el navegador sin conexión y pulsar *Guardar registro*: aparece «Guardamos el registro en este dispositivo».
3. Volver a tener conexión: el Service Worker dispara el evento `sync` y la cola se vacía sin intervención (la tarjeta de pendientes baja a 0 y el contador del Inicio sube).
