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

// `servidorAlcanzable` lo calcula el servidor al renderizar la página; esa foto puede estar vieja si la
// página salió del caché del Service Worker, así que también se tiene en cuenta el estado de red actual.
export default function EstadoConexion({ servidorAlcanzable }: { servidorAlcanzable: boolean }) {
  const hayRed = useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  );
  const conectado = servidorAlcanzable && hayRed;

  return (
    <section className={`card flex items-center gap-3 border ${conectado ? "border-sage/30" : "border-peach/30"}`}>
      <span className={`h-3 w-3 flex-shrink-0 rounded-full ${conectado ? "bg-sage" : "bg-peach"}`} aria-hidden />
      <p className="text-sm text-ink/80">
        {conectado
          ? "Conectado con el servidor del centro de salud. Los registros se sincronizan al instante."
          : "Sin conexión con el servidor. Los registros se guardan en este dispositivo y se envían al volver la señal."}
      </p>
    </section>
  );
}
