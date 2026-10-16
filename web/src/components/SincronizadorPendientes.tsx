"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { EVENTO_PENDIENTES_ENVIADOS, sincronizar } from "@/lib/pendientes";

// Envía los registros guardados sin conexión al abrir la app y cada vez que vuelve la señal.
// No dibuja nada: el estado se ve en la tarjeta de pendientes del Inicio.
export default function SincronizadorPendientes() {
  const router = useRouter();

  useEffect(() => {
    const intentar = () => {
      sincronizar().catch(() => {});
    };
    const refrescarDatos = () => router.refresh(); // los contadores del Inicio vienen del servidor

    intentar();
    window.addEventListener("online", intentar);
    window.addEventListener(EVENTO_PENDIENTES_ENVIADOS, refrescarDatos);
    return () => {
      window.removeEventListener("online", intentar);
      window.removeEventListener(EVENTO_PENDIENTES_ENVIADOS, refrescarDatos);
    };
  }, [router]);

  return null;
}
