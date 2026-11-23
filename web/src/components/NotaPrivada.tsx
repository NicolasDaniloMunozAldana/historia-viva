"use client";

import { useEffect, useState } from "react";
import { guardarNota, obtenerNota } from "@/lib/db";
import { cifrarTexto, descifrarTexto } from "@/lib/crypto";
import { obtenerClave, useNotasDesbloqueadas } from "@/lib/notasPrivadas";

// Nota privada de un paciente: solo en este dispositivo y cifrada. El nombre y la edad del paciente
// vienen del servidor y no se cifran; únicamente esta nota, que nunca sale del dispositivo.
export default function NotaPrivada({ pacienteId }: { pacienteId: string }) {
  const desbloqueadas = useNotasDesbloqueadas();
  const [abierta, setAbierta] = useState(false);
  const [tieneNota, setTieneNota] = useState(false);
  const [texto, setTexto] = useState("");
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  // Saber si ya hay una nota guardada no requiere descifrar nada.
  useEffect(() => {
    obtenerNota(pacienteId)
      .then((nota) => setTieneNota(Boolean(nota)))
      .catch(() => setTieneNota(false));
  }, [pacienteId]);

  // Con el panel abierto y las notas desbloqueadas, se descifra la nota de este paciente.
  useEffect(() => {
    const clave = obtenerClave();
    if (!abierta || !desbloqueadas || !clave) return;
    let vigente = true;
    obtenerNota(pacienteId)
      .then(async (nota) => {
        if (!vigente) return;
        setTexto(nota ? await descifrarTexto(clave, nota) : "");
        setMensaje(null);
      })
      .catch(() => {
        if (vigente) setMensaje({ texto: "No se pudo descifrar la nota con la clave actual.", error: true });
      });
    return () => {
      vigente = false;
    };
  }, [abierta, desbloqueadas, pacienteId]);

  async function guardar() {
    const clave = obtenerClave();
    if (!clave) return;
    const { cifrado, iv } = await cifrarTexto(clave, texto);
    await guardarNota({ pacienteId, cifrado, iv, actualizadaEn: Date.now() });
    setTieneNota(true);
    setMensaje({ texto: "Nota guardada, cifrada, en este dispositivo.", error: false });
  }

  return (
    <div className="mt-3 border-t border-ink/10 pt-3">
      <button type="button" className="text-sm font-bold text-sage-strong" onClick={() => setAbierta((v) => !v)}>
        {abierta ? "Ocultar nota privada" : tieneNota ? "Ver nota privada" : "Agregar nota privada"}
      </button>

      {abierta && (
        <div className="mt-2 flex flex-col gap-2">
          {!desbloqueadas ? (
            <p className="text-sm text-ink/80">Desbloquea tus notas privadas arriba para leer o escribir esta nota.</p>
          ) : (
            <>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Solo tú puedes leer esta nota."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
              <button type="button" className="btn-secondary self-start" onClick={guardar}>
                Guardar nota
              </button>
            </>
          )}
          {mensaje && <p className={`text-sm ${mensaje.error ? "text-peach-strong" : "text-sage-strong"}`}>{mensaje.texto}</p>}
        </div>
      )}
    </div>
  );
}
