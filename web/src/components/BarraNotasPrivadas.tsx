"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { bloquearNotas, desbloquearNotas, useNotasDesbloqueadas } from "@/lib/notasPrivadas";

// Desbloqueo de las notas privadas: la contraseña solo sirve para derivar la clave de cifrado,
// nunca se guarda. Al recargar o cerrar la app las notas vuelven a quedar bloqueadas.
export default function BarraNotasPrivadas() {
  const desbloqueada = useNotasDesbloqueadas();
  const [contrasena, setContrasena] = useState("");
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    if (!contrasena) return;
    setTrabajando(true);
    try {
      const resultado = await desbloquearNotas(contrasena);
      if (resultado === "incorrecta") setMensaje({ texto: "Contraseña incorrecta.", error: true });
      else if (resultado === "sin-cifrado")
        setMensaje({ texto: "El cifrado necesita una conexión segura (HTTPS) o localhost.", error: true });
      else
        setMensaje({
          texto: resultado === "creada" ? "Contraseña creada. Tus notas se guardarán cifradas." : "Notas desbloqueadas.",
          error: false,
        });
      setContrasena("");
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <section className="card flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-bold text-ink">Notas privadas</h2>
          <p className="text-xs text-ink/80">
            Se guardan cifradas en este dispositivo; solo se leen con tu contraseña.
          </p>
        </div>
        <span className={`badge ${desbloqueada ? "bg-sage/25 text-ink" : "bg-ink/10 text-ink/80"}`}>
          {desbloqueada ? "Desbloqueadas" : "Bloqueadas"}
        </span>
      </div>

      {desbloqueada ? (
        <button
          type="button"
          className="btn-secondary self-start"
          onClick={() => {
            bloquearNotas();
            setMensaje(null);
          }}
        >
          Bloquear
        </button>
      ) : (
        <form onSubmit={manejarEnvio} className="flex flex-wrap gap-2">
          <input
            className="input-field min-w-0 flex-1"
            type="password"
            placeholder="Contraseña de tus notas"
            autoComplete="off"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary" disabled={trabajando}>
            {trabajando ? "…" : "Desbloquear"}
          </button>
        </form>
      )}

      {mensaje && <p className={`text-sm ${mensaje.error ? "text-peach-strong" : "text-sage-strong"}`}>{mensaje.texto}</p>}
    </section>
  );
}
