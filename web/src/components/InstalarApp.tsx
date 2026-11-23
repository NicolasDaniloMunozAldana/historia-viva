"use client";

import { useEffect, useState } from "react";

interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Prompt de instalación propio (Sesión 23). Chrome/Edge disparan beforeinstallprompt y se muestra con un
// botón propio. Safari/iOS nunca lo dispara: ahí la instalación es manual, así que se explica el camino.
export default function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);
  const [esIOS, setEsIOS] = useState(false);

  useEffect(() => {
    const instalada = window.matchMedia("(display-mode: standalone)").matches;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    // El valor depende del navegador, que solo se conoce en el cliente: se calcula al montar.
    queueMicrotask(() => setEsIOS(ios && !instalada));

    const alOfrecer = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalacion);
    };
    const alInstalar = () => setEvento(null);
    window.addEventListener("beforeinstallprompt", alOfrecer);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", alOfrecer);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice;
    setEvento(null);
  }

  if (evento) {
    return (
      <section className="card flex flex-wrap items-center justify-between gap-3 border border-sage/30">
        <p className="text-sm text-ink/80">Instala HistoriaViva en este dispositivo para abrirla como una app.</p>
        <button type="button" className="btn-primary" onClick={instalar}>
          Instalar aplicación
        </button>
      </section>
    );
  }

  if (esIOS) {
    return (
      <section className="card border border-sage/30">
        <p className="text-sm text-ink/80">
          Para instalar HistoriaViva en este iPhone o iPad: toca <strong>Compartir</strong> y luego{" "}
          <strong>Añadir a pantalla de inicio</strong>.
        </p>
      </section>
    );
  }

  return null;
}
