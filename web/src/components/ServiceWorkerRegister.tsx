"use client";

import { useEffect } from "react";
import { Workbox } from "workbox-window";

// Registra el Service Worker generado por Workbox (Sesión 23) en silencio: el estado de instalación es
// información de diagnóstico (consola / DevTools), no algo que el personal de salud necesite ver.
// `workbox-window` es la pieza del lado de la página: simplifica registro y actualizaciones.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const wb = new Workbox("/sw.js");
    wb.addEventListener("activated", (evento) => {
      console.log(evento.isUpdate ? "SW de Workbox actualizado" : "SW de Workbox activo");
    });
    wb.register()
      .then((registro) => console.log("SW registrado:", registro?.scope))
      .catch((error) => console.error("Error al registrar SW:", error));
  }, []);

  return null;
}
