"use client";

import { useEffect, useRef, useState } from "react";
import type { Ubicacion } from "@/lib/db";
import {
  abrirCamara,
  capturarFoto,
  describirErrorCamara,
  describirErrorUbicacion,
  detenerCamara,
  estadoPermiso,
  formatearUbicacion,
  hayCamara,
  obtenerUbicacion,
  reducirImagen,
} from "@/lib/dispositivo";

export interface Evidencia {
  foto: Blob | null;
  ubicacion: Ubicacion | null;
}

interface Props {
  valor: Evidencia;
  onCambio: (valor: Evidencia) => void;
}

// Foto y ubicación del registro (Sesión 24). Los permisos se piden SIEMPRE dentro del clic del usuario,
// negarlos nunca impide guardar el registro y todo se queda en este dispositivo.
export default function CapturaEvidencia({ valor, onCambio }: Props) {
  const dialogoRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const flujoRef = useRef<MediaStream | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

  const [miniatura, setMiniatura] = useState<string | null>(null);
  const [mensajeFoto, setMensajeFoto] = useState<string | null>(null);
  const [mensajeUbicacion, setMensajeUbicacion] = useState<string | null>(null);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [camaraBloqueada, setCamaraBloqueada] = useState(false);
  const [explicandoCamara, setExplicandoCamara] = useState(false);

  // La URL de objeto ocupa memoria hasta que se libera: se revoca al cambiar la foto o desmontar.
  useEffect(() => {
    if (!valor.foto) return;
    const url = URL.createObjectURL(valor.foto);
    queueMicrotask(() => setMiniatura(url));
    return () => URL.revokeObjectURL(url);
  }, [valor.foto]);

  useEffect(() => {
    estadoPermiso("camera").then((estado) => setCamaraBloqueada(estado === "denied"));
    return () => detenerCamara(flujoRef.current);
  }, []);

  function cerrarCamara() {
    detenerCamara(flujoRef.current);
    flujoRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  // Antes del aviso del navegador, una explicación breve: un permiso denegado casi nunca se recupera.
  async function pedirCamara() {
    setMensajeFoto(null);
    if ((await estadoPermiso("camera")) === "prompt") setExplicandoCamara(true);
    else await tomarFoto();
  }

  async function tomarFoto() {
    setExplicandoCamara(false);
    setMensajeFoto(null);
    if (!hayCamara()) {
      setMensajeFoto("La cámara solo funciona con HTTPS o en localhost. Puedes elegir una imagen de la galería.");
      return;
    }
    try {
      const flujo = await abrirCamara("environment");
      flujoRef.current = flujo;
      videoRef.current!.srcObject = flujo;
      dialogoRef.current!.showModal();
      setCamaraBloqueada(false);
    } catch (error) {
      if ((error as { name?: string })?.name === "NotAllowedError") setCamaraBloqueada(true);
      setMensajeFoto(describirErrorCamara(error));
    }
  }

  async function capturar() {
    const video = videoRef.current!;
    if (!video.videoWidth) return;
    try {
      const foto = await capturarFoto(video);
      onCambio({ ...valor, foto });
    } catch {
      setMensajeFoto("No se pudo guardar la foto. Intenta de nuevo.");
    } finally {
      dialogoRef.current?.close();
    }
  }

  async function elegirArchivo(archivo: File | undefined) {
    if (!archivo) return;
    setMensajeFoto(null);
    try {
      onCambio({ ...valor, foto: await reducirImagen(archivo) });
    } catch {
      setMensajeFoto("No se pudo leer esa imagen. Prueba con otra.");
    }
  }

  async function agregarUbicacion() {
    setMensajeUbicacion(null);
    setBuscandoUbicacion(true);
    try {
      onCambio({ ...valor, ubicacion: await obtenerUbicacion() });
    } catch (error) {
      setMensajeUbicacion(describirErrorUbicacion(error));
    } finally {
      setBuscandoUbicacion(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 p-4">
      <div>
        <p className="text-sm font-semibold text-ink">Evidencia y lugar del registro</p>
        <p className="text-xs text-ink/80">
          Opcional. La foto y la ubicación se guardan solo en este dispositivo; no se envían al servidor.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {valor.foto && miniatura ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={miniatura} alt="Evidencia fotográfica del registro" className="h-20 w-20 rounded-xl object-cover" />
            <div className="flex flex-col items-start gap-1">
              <p className="text-xs text-ink/80">Foto adjunta · {Math.max(1, Math.round(valor.foto.size / 1024))} kB</p>
              <button type="button" className="btn-secondary" onClick={() => onCambio({ ...valor, foto: null })}>
                Quitar foto
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary" onClick={pedirCamara} disabled={camaraBloqueada}>
              Tomar foto
            </button>
            <button type="button" className="btn-secondary" onClick={() => archivoRef.current?.click()}>
              Elegir de la galería
            </button>
            <input
              ref={archivoRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                elegirArchivo(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        )}
        {explicandoCamara && (
          <div className="flex flex-col gap-2 rounded-2xl bg-ink/5 p-3">
            <p className="text-sm text-ink">
              Usaremos tu cámara solo para adjuntar una foto a este registro; no sale de tu dispositivo.
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn-primary" onClick={tomarFoto}>
                Continuar
              </button>
              <button type="button" className="btn-secondary" onClick={() => setExplicandoCamara(false)}>
                Ahora no
              </button>
            </div>
          </div>
        )}
        {camaraBloqueada && (
          <p className="text-xs text-peach-strong">
            La cámara está bloqueada para esta aplicación. Para usarla, habilítala desde el candado de la barra de
            direcciones; mientras tanto puedes elegir una imagen de la galería.
          </p>
        )}
        {mensajeFoto && !camaraBloqueada && <p className="text-xs text-peach-strong">{mensajeFoto}</p>}
      </div>

      <div className="flex flex-col gap-2">
        {valor.ubicacion ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-ink">Ubicación: {formatearUbicacion(valor.ubicacion)}</p>
            <button type="button" className="btn-secondary" onClick={() => onCambio({ ...valor, ubicacion: null })}>
              Quitar ubicación
            </button>
          </div>
        ) : (
          <div>
            <button type="button" className="btn-secondary" onClick={agregarUbicacion} disabled={buscandoUbicacion}>
              {buscandoUbicacion ? "Buscando ubicación…" : "Agregar ubicación"}
            </button>
          </div>
        )}
        {mensajeUbicacion && <p className="text-xs text-peach-strong">{mensajeUbicacion}</p>}
      </div>

      {/* Un único diálogo; el evento "close" también cubre la tecla Esc: la cámara nunca queda encendida. */}
      <dialog
        ref={dialogoRef}
        onClose={cerrarCamara}
        className="m-auto w-[min(92vw,34rem)] rounded-3xl border-0 bg-white p-4 shadow-xl backdrop:bg-ink/50"
      >
        <div className="flex flex-col gap-3">
          <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-2xl bg-ink/10" />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => dialogoRef.current?.close()}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={capturar}>
              Capturar
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
