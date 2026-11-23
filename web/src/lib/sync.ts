// Background Sync (Sesión 26): pedirle al navegador que dispare el evento «sync» del Service Worker en cuanto
// haya conexión, aunque la app esté cerrada. Si el navegador no lo ofrece (Safari, Firefox), el plan B es el
// que ya existía: enviar al abrir la app y al evento «online» (SincronizadorPendientes).
import { API_URL } from "./api";
import { guardarConfig } from "./db";

export const ETIQUETA_SYNC = "hv-sync-pendientes";

type RegistroConSync = ServiceWorkerRegistration & { sync?: { register(etiqueta: string): Promise<void> } };

export function backgroundSyncDisponible(): boolean {
  return "serviceWorker" in navigator && "SyncManager" in window;
}

/** El Service Worker no conoce la dirección del servidor: la página la deja guardada en IndexedDB. */
export function recordarDireccionDelServidor(): Promise<unknown> {
  return guardarConfig("apiUrl", API_URL);
}

/** Pide la sincronización en segundo plano. Devuelve false si no se pudo (queda el plan B). */
export async function pedirSincronizacionEnSegundoPlano(): Promise<boolean> {
  if (!backgroundSyncDisponible()) return false;
  try {
    await recordarDireccionDelServidor();
    const registro = (await navigator.serviceWorker.ready) as RegistroConSync;
    await registro.sync?.register(ETIQUETA_SYNC);
    return true;
  } catch {
    return false; // el usuario bloqueó la sincronización en segundo plano para este sitio
  }
}
