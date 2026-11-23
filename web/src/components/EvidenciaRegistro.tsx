"use client";

import { useEffect, useState } from "react";
import { obtenerEvidencia, type Ubicacion } from "@/lib/db";
import { formatearUbicacion } from "@/lib/dispositivo";
import { obtenerEvidenciaServidor } from "@/lib/api";

// Muestra la foto y la ubicación guardadas en este dispositivo para un registro ya enviado.
// No dibuja nada si ese registro no tiene evidencias aquí.
export default function EvidenciaRegistro({ registroId }: { registroId: string }) {
  const [miniatura, setMiniatura] = useState<string | null>(null);
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let activo = true;
    obtenerEvidencia(registroId)
      .then(async (evidencia) => {
        if (!activo) return;
        if (evidencia) {
          if (evidencia.foto) {
            url = URL.createObjectURL(evidencia.foto);
            setMiniatura(url);
          }
          setUbicacion(evidencia.ubicacion);
          return;
        }
        // No está en este dispositivo (la tomó otro cuidador): se pide la que se subió al servidor al sincronizar.
        const remota = await obtenerEvidenciaServidor(registroId);
        if (!activo) return;
        if (remota.foto) setMiniatura(remota.foto);
        setUbicacion(remota.ubicacion);
      })
      .catch(() => {});
    return () => {
      activo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [registroId]);

  if (!miniatura && !ubicacion) return null;

  return (
    <div className="mt-1 flex items-center gap-2">
      {miniatura && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={miniatura} alt="Evidencia fotográfica" className="h-10 w-10 rounded-lg object-cover" />
      )}
      {ubicacion && <span className="text-xs text-ink/80">{formatearUbicacion(ubicacion)}</span>}
    </div>
  );
}
