"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { avisarCambioEnPendientes, EVENTO_PENDIENTES_ENVIADOS, sincronizar } from "@/lib/pendientes";
import { recordarDireccionDelServidor } from "@/lib/sync";

// Envía los registros guardados sin conexión al abrir la app y cada vez que vuelve la señal.
// No dibuja nada: el estado se ve en la tarjeta de pendientes del Inicio.
export default function SincronizadorPendientes() {
  const router = useRouter();

  useEffect(() => {
    const intentar = () => {
      sincronizar().catch(() => {});
    };
    const refrescarDatos = () => router.refresh(); // los contadores del Inicio vienen del servidor

    // El Service Worker necesita saber a qué servidor enviar (lo lee de IndexedDB).
    void recordarDireccionDelServidor().catch(() => {});

    // El Service Worker vació la cola en segundo plano (Background Sync): la pantalla se pone al día.
    const alMensaje = (e: MessageEvent) => {
      if (e.data?.tipo !== "hv-sincronizado") return;
      avisarCambioEnPendientes();
      if (e.data.enviados > 0) window.dispatchEvent(new CustomEvent(EVENTO_PENDIENTES_ENVIADOS, { detail: e.data.enviados }));
    };
    navigator.serviceWorker?.addEventListener("message", alMensaje);

    intentar();
    window.addEventListener("online", intentar);
    window.addEventListener(EVENTO_PENDIENTES_ENVIADOS, refrescarDatos);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", alMensaje);
      window.removeEventListener("online", intentar);
      window.removeEventListener(EVENTO_PENDIENTES_ENVIADOS, refrescarDatos);
    };
  }, [router]);

  return null;
}
