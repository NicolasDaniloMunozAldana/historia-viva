"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { extraerPendiente, obtenerPendientes, restaurarPendiente } from "@/lib/db";
import type { RegistroPendiente } from "@/lib/db";
import {
  avisarCambioEnPendientes,
  EVENTO_PENDIENTES_CAMBIARON,
  EVENTO_PENDIENTES_ENVIADOS,
  sincronizar,
} from "@/lib/pendientes";
import { detectarSacudida, escucharOrientacion, hayLecturasReales, pedirPermisoSensores } from "@/lib/sensores";

function hace(marca: number): string {
  const minutos = Math.max(0, Math.round((Date.now() - marca) / 60000));
  if (minutos < 1) return "hace un momento";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  return horas < 24 ? `hace ${horas} h` : `hace ${Math.round(horas / 24)} d`;
}

export default function PendientesCard() {
  const [pendientes, setPendientes] = useState<RegistroPendiente[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [descartado, setDescartado] = useState<RegistroPendiente | null>(null);
  const [sensoresActivos, setSensoresActivos] = useState(false);
  const [avisoSensores, setAvisoSensores] = useState<string | null>(null);
  const descartadoRef = useRef<RegistroPendiente | null>(null);
  const [inclinacion, setInclinacion] = useState<{ beta: number; gamma: number } | null>(null);
  const apagarSacudida = useRef<(() => void) | null>(null);

  const cargar = useCallback(() => {
    obtenerPendientes()
      .then(setPendientes)
      .catch(() => setPendientes([]));
  }, []);

  useEffect(() => {
    cargar();
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const alEnviar = (evento: Event) => {
      const cantidad = (evento as CustomEvent<number>).detail;
      setAviso(
        cantidad === 1
          ? "Se envió 1 registro que estaba pendiente."
          : `Se enviaron ${cantidad} registros que estaban pendientes.`,
      );
      clearTimeout(temporizador);
      temporizador = setTimeout(() => setAviso(null), 6000);
    };
    window.addEventListener(EVENTO_PENDIENTES_CAMBIARON, cargar);
    window.addEventListener(EVENTO_PENDIENTES_ENVIADOS, alEnviar);
    return () => {
      clearTimeout(temporizador);
      window.removeEventListener(EVENTO_PENDIENTES_CAMBIARON, cargar);
      window.removeEventListener(EVENTO_PENDIENTES_ENVIADOS, alEnviar);
    };
  }, [cargar]);

  async function descartar(id: number) {
    const pendiente = await extraerPendiente(id);
    if (!pendiente) return;
    descartadoRef.current = pendiente;
    setDescartado(pendiente);
    avisarCambioEnPendientes();
  }

  // La misma acción la dispara el botón o la sacudida; por eso lee la referencia y no el estado.
  const deshacerDescarte = useCallback(async () => {
    const pendiente = descartadoRef.current;
    if (!pendiente) return;
    descartadoRef.current = null;
    setDescartado(null);
    await restaurarPendiente(pendiente);
    avisarCambioEnPendientes();
  }, []);

  async function alternarSensores() {
    setAvisoSensores(null);
    if (sensoresActivos) {
      apagarSacudida.current?.();
      apagarSacudida.current = null;
      setSensoresActivos(false);
      setInclinacion(null);
      return;
    }
    const permiso = await pedirPermisoSensores(); // en iOS, dentro del clic
    if (permiso === "denied") {
      setAvisoSensores("No diste acceso a los sensores. El botón «Deshacer» sigue disponible.");
      return;
    }
    if (permiso === "no-soportado" || !(await hayLecturasReales())) {
      setAvisoSensores("Este dispositivo no tiene sensores de movimiento. Usa el botón «Deshacer».");
      return;
    }
    const apagarSacudidaSensor = detectarSacudida(() => {
      deshacerDescarte().catch(() => {});
    });
    const apagarOrientacion = escucharOrientacion(setInclinacion);
    apagarSacudida.current = () => {
      apagarSacudidaSensor();
      apagarOrientacion();
    };
    setSensoresActivos(true);
  }

  useEffect(() => () => apagarSacudida.current?.(), []);

  async function enviarAhora() {
    setEnviando(true);
    try {
      const enviados = await sincronizar();
      if (enviados === 0) setAviso("Todavía no hay conexión con el servidor. Lo intentaremos de nuevo al volver la señal.");
    } finally {
      setEnviando(false);
    }
  }

  if (pendientes.length === 0 && !aviso && !descartado) return null;

  return (
    <section className="card flex flex-col gap-3 border border-peach/40" aria-live="polite">
      {pendientes.length > 0 && (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold text-ink">Pendientes de envío</h2>
              <p className="text-sm text-ink/80">
                {pendientes.length === 1
                  ? "1 registro se guardó en este dispositivo y se enviará al volver la señal."
                  : `${pendientes.length} registros se guardaron en este dispositivo y se enviarán al volver la señal.`}
              </p>
            </div>
            <span className="badge bg-peach/25 text-ink">{pendientes.length}</span>
          </div>
          <ul className="flex flex-col gap-2">
            {pendientes.map((pendiente) => (
              <li key={pendiente.id} className="flex items-center justify-between rounded-2xl bg-peach/10 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{pendiente.pacienteNombre}</p>
                  <p className="text-xs text-ink/80">
                    {pendiente.presionArterial} · {pendiente.frecuenciaCardiaca} lpm · {hace(pendiente.creadoEn)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {pendiente.ultimoError && <span className="badge bg-peach/25 text-peach-strong">Revisar</span>}
                  {pendiente.foto && <span className="badge bg-sage/20 text-ink">Foto</span>}
                  <button type="button" className="text-xs font-semibold text-ink/80 underline" onClick={() => descartar(pendiente.id!)}>
                    Descartar
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-secondary self-start" onClick={enviarAhora} disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar ahora"}
          </button>
        </>
      )}
      {descartado && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink/5 px-4 py-3">
          <p className="text-sm text-ink">Descartaste el registro de {descartado.pacienteNombre}.</p>
          <button type="button" className="btn-secondary" onClick={() => deshacerDescarte()}>
            Deshacer
          </button>
        </div>
      )}
      {(pendientes.length > 0 || descartado) && (
        <div className="flex flex-col gap-1">
          <button type="button" className="self-start text-xs font-semibold text-ink/80 underline" onClick={alternarSensores}>
            {sensoresActivos ? "Agitar para deshacer: activado (tocar para apagar)" : "Activar agitar para deshacer"}
          </button>
          {sensoresActivos && inclinacion && (
            <p className="text-xs text-ink/80">
              Inclinación: β {inclinacion.beta}° · γ {inclinacion.gamma}°
            </p>
          )}
          {avisoSensores && <p className="text-xs text-peach-strong">{avisoSensores}</p>}
        </div>
      )}
      {aviso && <p className="text-sm text-sage-strong">{aviso}</p>}
    </section>
  );
}
