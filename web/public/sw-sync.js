// sw-sync.js — Background Sync de HistoriaViva. Lo carga el Service Worker de Workbox con importScripts
// (ver scripts/generar-sw.mjs). Cuando el navegador recupera la conexión dispara el evento «sync» AUNQUE la
// app esté cerrada: aquí se vacía la cola de registros pendientes guardada en IndexedDB.
//
// Es JavaScript clásico (no TypeScript ni módulos) porque lo carga importScripts. Repite a propósito la
// lógica de src/lib/pendientes.ts: la página y el Service Worker no comparten código, solo la base de datos.
const ETIQUETA_SYNC = "hv-sync-pendientes";
const BD_NOMBRE = "historiaviva-db";

function promesa(peticion) {
  return new Promise((resolve, reject) => {
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
  });
}

function abrirBD() {
  return promesa(indexedDB.open(BD_NOMBRE)); // sin versión: abre la que ya creó la página
}

function leerConfig(db, clave) {
  return promesa(db.transaction("config", "readonly").objectStore("config").get(clave)).then((r) => r && r.valor);
}

function aDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(blob);
  });
}

async function enviarJSON(url, metodo, cuerpo) {
  // Si fetch LANZA es un fallo de red: se propaga para que el navegador reintente más tarde.
  return fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
}

async function vaciarCola() {
  const db = await abrirBD();
  try {
    const api = await leerConfig(db, "apiUrl");
    if (!api) return 0; // la página aún no ha guardado la dirección del servidor
    const pendientes = await promesa(db.transaction("pendientes", "readonly").objectStore("pendientes").index("porCreadoEn").getAll());
    let enviados = 0;
    for (const p of pendientes) {
      const res = await enviarJSON(`${api}/pacientes/${p.pacienteId}/registros`, "POST", {
        presionArterial: p.presionArterial,
        frecuenciaCardiaca: p.frecuenciaCardiaca,
        temperatura: p.temperatura,
        dosisAdministrada: p.dosisAdministrada,
        horaAdministracion: p.horaAdministracion,
        tieneEvidenciaFoto: p.tieneEvidenciaFoto,
        registradoPor: p.registradoPor,
        idCliente: p.idCliente, // el servidor no duplica un reenvío con el mismo id
        recordarEnMinutos: p.recordarEnMinutos,
      });
      if (!res.ok) {
        // El servidor respondió con error: el registro se conserva, con el motivo, para revisarlo en la app.
        const fallo = { ...p, intentos: (p.intentos || 0) + 1, ultimoError: `Error ${res.status} al sincronizar` };
        await promesa(db.transaction("pendientes", "readwrite").objectStore("pendientes").put(fallo));
        continue;
      }
      const registro = await res.json();
      if (p.foto || p.ubicacion) {
        const evidencia = { foto: p.foto ? await aDataUrl(p.foto) : null, ubicacion: p.ubicacion || null };
        await enviarJSON(`${api}/registros/${registro.id}/evidencia`, "PUT", evidencia).catch((e) => {
          throw e;
        });
        await promesa(
          db.transaction("evidencias", "readwrite").objectStore("evidencias").put({
            registroId: registro.id,
            foto: p.foto || null,
            ubicacion: p.ubicacion || null,
            guardadaEn: Date.now(),
          }),
        );
      }
      await promesa(db.transaction("pendientes", "readwrite").objectStore("pendientes").delete(p.id));
      enviados++;
    }
    return enviados;
  } finally {
    db.close();
  }
}

self.addEventListener("sync", (evento) => {
  if (evento.tag !== ETIQUETA_SYNC) return;
  evento.waitUntil(
    (async () => {
      const enviados = await vaciarCola(); // si lanza, el navegador reintenta solo
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      ventanas.forEach((v) => v.postMessage({ tipo: "hv-sincronizado", enviados }));
      const mirando = ventanas.some((v) => v.visibilityState === "visible");
      if (enviados > 0 && !mirando && self.Notification && Notification.permission === "granted") {
        await self.registration.showNotification("HistoriaViva", {
          body: enviados === 1 ? "Se sincronizó 1 registro pendiente." : `Se sincronizaron ${enviados} registros pendientes.`,
          icon: "/icons/icon-192.png",
          tag: "hv-sincronizado",
        });
      }
    })(),
  );
});

// ── Notificaciones push ──────────────────────────────────────────────────────────────────────────────
// El servidor envía un mensaje cifrado; el navegador despierta este Service Worker aunque la app esté cerrada
// y aquí se muestra la notificación. userVisibleOnly:true obliga a mostrar SIEMPRE una (no hay push «mudo»).
self.addEventListener("push", (evento) => {
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch {
    datos = { cuerpo: evento.data ? evento.data.text() : "" };
  }
  evento.waitUntil(
    self.registration.showNotification(datos.titulo || "HistoriaViva", {
      body: datos.cuerpo || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: datos.tag || "historiaviva", // el mismo tag reemplaza a la notificación anterior
      data: { url: datos.url || "/" },
    }),
  );
});

// Tocar la notificación enfoca la app abierta (y la lleva a la ruta) o la abre.
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = new URL((evento.notification.data && evento.notification.data.url) || "/", self.location.origin).href;
  evento.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const abierta = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
      if (abierta) {
        await abierta.navigate(destino).catch(() => null);
        return abierta.focus();
      }
      return self.clients.openWindow(destino);
    })(),
  );
});
