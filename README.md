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
| **Notificaciones push desde el servidor** (Web Push + VAPID): aviso de nuevos registros y recordatorio programado de la próxima dosis, con la app cerrada | ✅ nuevo | `api/src/push/`, `web/src/lib/push.ts`, `web/public/sw-sync.js` |
| Panel de seguimiento para el centro de salud | ⏭ trabajo futuro | — |

Limitación asumida: una app web **no puede programar alertas locales con la app cerrada**; por eso las alertas las envía el **servidor** por push. Un dispositivo sin conexión las recibe cuando vuelve la red (el servicio push las retiene hasta 1 hora).

## Notificaciones push
- En **Inicio → Notificaciones** se pulsa «Activar notificaciones»: el navegador crea una suscripción con la clave pública VAPID del servidor y se la entrega (`POST /api/push/suscripciones`).
- Cada vez que se crea un registro, el servidor avisa a los dispositivos suscritos («Mileth registró a Rosa…»).
- En el formulario de registro se puede pedir **«Recordarme la próxima dosis»** (la opción «En 1 minuto» sirve para probar): el servidor guarda el recordatorio y lo envía cuando vence, aunque la app esté cerrada.
- El Service Worker (`sw-sync.js`) recibe el mensaje en el evento `push` y muestra la notificación; al tocarla abre la app.
- Si un servicio push responde 404/410 (app desinstalada), la suscripción se elimina sola. Al abrir la app el dispositivo se vuelve a registrar si el servidor perdió sus suscripciones.
- En iPhone solo funciona con la app **instalada** en la pantalla de inicio (iOS 16.4+).

### Variables de entorno de la API (Render)
| Variable | Para qué |
|---|---|
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Claves VAPID (generarlas una vez con `npx web-push generate-vapid-keys`). Si no se definen, se generan al arrancar y se pierden en un reinicio (el dispositivo se vuelve a suscribir solo). |
| `VAPID_SUBJECT` | Contacto del remitente, p. ej. `mailto:correo@dominio.com`. |
| `HV_DATA_FILE`, `HV_PUSH_FILE` | Archivos JSON de datos y de suscripciones (por defecto `data/`). Vacío = sin persistencia. |
Web: `NEXT_PUBLIC_API_URL` = URL pública de la API terminada en `/api`.

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

Pruebas del servidor (12): `cd api && npm test`.

## Probar el flujo offline → sincronización
1. Abrir `/registro`, elegir un paciente y llenar el formulario.
2. Poner el navegador sin conexión y pulsar *Guardar registro*: aparece «Guardamos el registro en este dispositivo».
3. Volver a tener conexión: el Service Worker dispara el evento `sync` y la cola se vacía sin intervención (la tarjeta de pendientes baja a 0 y el contador del Inicio sube).
