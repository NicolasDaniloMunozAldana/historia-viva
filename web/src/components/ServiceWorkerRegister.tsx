"use client";

import { useEffect, useState } from "react";

export default function ServiceWorkerRegister() {
  const [estado, setEstado] = useState<"comprobando" | "activo" | "error" | "no-soportado">(
    "comprobando",
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setEstado("no-soportado");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then((registro) => {
        console.log("SW registrado:", registro.scope);
        setEstado("activo");
      })
      .catch((error) => {
        console.error("Error al registrar SW:", error);
        setEstado("error");
      });
  }, []);

  const estilos: Record<typeof estado, string> = {
    comprobando: "bg-purple-6 text-purple-3",
    activo: "bg-green-2 text-[#047e49]",
    error: "bg-[#f2dbda] text-status-red",
    "no-soportado": "bg-[#f2dbda] text-status-red",
  };

  const textos: Record<typeof estado, string> = {
    comprobando: "Service Worker: comprobando…",
    activo: "Service Worker: activo",
    error: "Service Worker: error al registrar",
    "no-soportado": "Sin soporte de Service Workers",
  };

  return <span className={`badge ${estilos[estado]}`}>{textos[estado]}</span>;
}
