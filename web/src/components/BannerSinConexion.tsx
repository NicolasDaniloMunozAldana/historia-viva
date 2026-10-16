"use client";

import { useSyncExternalStore } from "react";

function suscribir(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

// Indicador de conexión visible en todas las pantallas (Sesión 23, UX de PWA): el usuario debe saber
// si está viendo datos frescos o una versión guardada en este dispositivo.
export default function BannerSinConexion() {
  const hayRed = useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  );
  if (hayRed) return null;
  return (
    <div role="status" className="bg-peach/25 px-4 py-2 text-center text-xs font-semibold text-ink">
      Sin conexión — mostrando los datos guardados en este dispositivo
    </div>
  );
}
