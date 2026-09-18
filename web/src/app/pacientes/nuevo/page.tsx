"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { crearPaciente } from "@/lib/api";

export default function NuevoPacientePage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await crearPaciente({ nombre, edad: Number(edad), direccion, notas: notas || undefined });
      router.push("/pacientes");
      router.refresh();
    } catch {
      setError("No se pudo guardar el paciente. Verifica que la API esté corriendo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-purple-1">Nuevo paciente</h1>

      <form onSubmit={manejarEnvio} className="card flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-semibold text-black-2">
          Nombre completo
          <input
            className="input-field"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold text-black-2">
          Edad
          <input
            className="input-field"
            type="number"
            min={0}
            value={edad}
            onChange={(e) => setEdad(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold text-black-2">
          Dirección / vereda
          <input
            className="input-field"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold text-black-2">
          Notas clínicas (opcional)
          <textarea
            className="input-field"
            rows={3}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-status-red">{error}</p>}

        <button type="submit" className="btn-primary self-start" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar paciente"}
        </button>
      </form>
    </div>
  );
}
