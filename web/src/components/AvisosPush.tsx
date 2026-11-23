"use client";

import { useEffect, useState } from "react";
import { activarPush, desactivarPush, enviarPrueba, estadoPush, sincronizarSuscripcion, type EstadoPush } from "@/lib/push";

const TEXTO: Record<EstadoPush, string> = {
  "no-soportado": "Este navegador no admite notificaciones push.",
  "necesita-instalar": "En iPhone, instala la app («Añadir a pantalla de inicio») para poder recibir notificaciones.",
  denegado: "Bloqueaste las notificaciones. Habilítalas desde el candado de la barra de direcciones.",
  inactivo: "Activa las notificaciones para enterarte de nuevos registros y de la próxima dosis, aunque la app esté cerrada.",
  activo: "Notificaciones activas en este dispositivo: el servidor te avisa aunque la app esté cerrada.",
};

// Tarjeta de notificaciones push: activar/desactivar y enviar un aviso de prueba que sale del servidor.
export default function AvisosPush() {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let activo = true;
    estadoPush()
      .then((e) => {
        if (activo) setEstado(e);
        if (e === "activo") sincronizarSuscripcion().catch(() => {}); // por si el servidor se reinició
      })
      .catch(() => activo && setEstado("no-soportado"));
    return () => {
      activo = false;
    };
  }, []);

  async function ejecutar(accion: () => Promise<EstadoPush>) {
    setOcupado(true);
    setMensaje(null);
    try {
      setEstado(await accion());
    } catch {
      setMensaje("No se pudo completar la acción. ¿Hay conexión con el servidor?");
    } finally {
      setOcupado(false);
    }
  }

  async function probar() {
    setOcupado(true);
    setMensaje(null);
    try {
      const n = await enviarPrueba();
      setMensaje(n > 0 ? `Aviso enviado a ${n} dispositivo${n === 1 ? "" : "s"}.` : "El servidor no tiene dispositivos suscritos.");
    } catch {
      setMensaje("No se pudo enviar el aviso de prueba.");
    } finally {
      setOcupado(false);
    }
  }

  if (estado === null) return null;

  return (
    <section className="card flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-bold text-ink">Notificaciones</h2>
          <p className="text-xs text-ink/80">{TEXTO[estado]}</p>
        </div>
        <span className={`badge ${estado === "activo" ? "bg-sage/25 text-ink" : "bg-ink/10 text-ink/80"}`}>{estado === "activo" ? "Activas" : "Inactivas"}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {estado === "inactivo" && (
          <button type="button" className="btn-primary" disabled={ocupado} onClick={() => ejecutar(activarPush)}>
            Activar notificaciones
          </button>
        )}
        {estado === "activo" && (
          <>
            <button type="button" className="btn-primary" disabled={ocupado} onClick={() => void probar()}>
              Enviar aviso de prueba
            </button>
            <button type="button" className="btn-secondary" disabled={ocupado} onClick={() => ejecutar(desactivarPush)}>
              Desactivar
            </button>
          </>
        )}
      </div>
      {mensaje && <p className="text-sm text-ink/80">{mensaje}</p>}
    </section>
  );
}
