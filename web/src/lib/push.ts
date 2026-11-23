// Notificaciones push (Web Push + VAPID). A diferencia de una notificación local, el SERVIDOR decide cuándo
// avisar, así que llega aunque la app esté cerrada. El navegador entrega el mensaje al Service Worker
// (public/sw-sync.js, evento «push») y este muestra la notificación.
import { API_URL } from "./api";

export type EstadoPush = "no-soportado" | "necesita-instalar" | "denegado" | "inactivo" | "activo";

export function pushSoportado(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// En iPhone/iPad las notificaciones push solo existen si la app está instalada en la pantalla de inicio (iOS 16.4+).
function iosSinInstalar(): boolean {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalada = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !instalada;
}

function base64AUint8(b64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (b64.length % 4)) % 4);
  const binario = atob((b64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

function iguales(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

async function enviar(ruta: string, metodo: string, cuerpo?: unknown): Promise<Response> {
  return fetch(`${API_URL}${ruta}`, { method: metodo, headers: { "Content-Type": "application/json" }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
}

async function claveDelServidor(): Promise<Uint8Array<ArrayBuffer>> {
  const respuesta = await enviar("/push/clave", "GET");
  if (!respuesta.ok) throw new Error("No se pudo obtener la clave del servidor");
  return base64AUint8(((await respuesta.json()) as { clave: string }).clave);
}

export async function estadoPush(): Promise<EstadoPush> {
  if (!pushSoportado()) return iosSinInstalar() ? "necesita-instalar" : "no-soportado";
  if (Notification.permission === "denied") return "denegado";
  const registro = await navigator.serviceWorker.ready;
  return (await registro.pushManager.getSubscription()) ? "activo" : "inactivo";
}

/** Crea la suscripción de este dispositivo y se la entrega al servidor. El permiso se pide AQUÍ, dentro de un clic. */
export async function activarPush(): Promise<EstadoPush> {
  if (!pushSoportado()) return iosSinInstalar() ? "necesita-instalar" : "no-soportado";
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") return permiso === "denied" ? "denegado" : "inactivo";
  await sincronizarSuscripcion(true);
  return estadoPush();
}

/**
 * Deja la suscripción al día en el servidor. Se llama al abrir la app: si el servidor se reinició y perdió sus
 * suscripciones (o cambió su clave), este dispositivo se vuelve a registrar solo.
 */
export async function sincronizarSuscripcion(crear = false): Promise<void> {
  if (!pushSoportado() || Notification.permission !== "granted") return;
  const registro = await navigator.serviceWorker.ready;
  const clave = await claveDelServidor();
  let suscripcion = await registro.pushManager.getSubscription();
  // Una suscripción hecha con otra clave VAPID ya no sirve: se reemplaza.
  if (suscripcion && !iguales(suscripcion.options.applicationServerKey, clave)) {
    await suscripcion.unsubscribe();
    suscripcion = null;
  }
  if (!suscripcion && crear) suscripcion = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clave });
  if (suscripcion) await enviar("/push/suscripciones", "POST", { suscripcion: suscripcion.toJSON() });
}

export async function desactivarPush(): Promise<EstadoPush> {
  const registro = await navigator.serviceWorker.ready;
  const suscripcion = await registro.pushManager.getSubscription();
  if (suscripcion) {
    await enviar("/push/suscripciones", "DELETE", { endpoint: suscripcion.endpoint }).catch(() => {});
    await suscripcion.unsubscribe();
  }
  return estadoPush();
}

/** Pide al servidor que mande un aviso de prueba a los dispositivos suscritos. */
export async function enviarPrueba(): Promise<number> {
  const respuesta = await enviar("/push/prueba", "POST");
  if (!respuesta.ok) throw new Error("El servidor no pudo enviar el aviso");
  return ((await respuesta.json()) as { entregados: number }).entregados;
}
