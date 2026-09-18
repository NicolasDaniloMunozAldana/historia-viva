"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { crearRegistro, listarPacientes, type Paciente } from "@/lib/api";

function FormularioRegistro() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pacienteIdInicial = searchParams.get("pacienteId") ?? "";

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] = useState(pacienteIdInicial);
  const [presionArterial, setPresionArterial] = useState("");
  const [frecuenciaCardiaca, setFrecuenciaCardiaca] = useState("");
  const [temperatura, setTemperatura] = useState("");
  const [dosisAdministrada, setDosisAdministrada] = useState("");
  const [horaAdministracion, setHoraAdministracion] = useState("");
  const [tieneEvidenciaFoto, setTieneEvidenciaFoto] = useState(false);
  const [registradoPor, setRegistradoPor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    listarPacientes()
      .then(setPacientes)
      .catch(() => setError("No se pudo conectar con el servidor. Verifica que la API esté corriendo."));
  }, []);

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setExito(false);
    setEnviando(true);
    try {
      await crearRegistro(pacienteId, {
        presionArterial,
        frecuenciaCardiaca: Number(frecuenciaCardiaca),
        temperatura: Number(temperatura),
        dosisAdministrada,
        horaAdministracion,
        tieneEvidenciaFoto,
        registradoPor,
      });
      setExito(true);
      setPresionArterial("");
      setFrecuenciaCardiaca("");
      setTemperatura("");
      setDosisAdministrada("");
      setHoraAdministracion("");
      setTieneEvidenciaFoto(false);
      router.refresh();
    } catch {
      setError("No se pudo guardar el registro. Verifica que la API esté corriendo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-purple-1">Registrar signos vitales</h1>
        <p className="text-sm text-black-3">
          En la versión final este registro queda guardado en el dispositivo aunque no haya señal.
        </p>
      </div>

      <form onSubmit={manejarEnvio} className="card flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-semibold text-black-2">
          Paciente
          <select
            className="input-field"
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            required
          >
            <option value="" disabled>
              Selecciona un paciente
            </option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm font-semibold text-black-2">
            Presión arterial
            <input
              className="input-field"
              placeholder="120/80"
              value={presionArterial}
              onChange={(e) => setPresionArterial(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-black-2">
            Frecuencia cardíaca (lpm)
            <input
              className="input-field"
              type="number"
              value={frecuenciaCardiaca}
              onChange={(e) => setFrecuenciaCardiaca(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-black-2">
            Temperatura (°C)
            <input
              className="input-field"
              type="number"
              step="0.1"
              value={temperatura}
              onChange={(e) => setTemperatura(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-black-2">
            Hora de administración
            <input
              className="input-field"
              type="time"
              value={horaAdministracion}
              onChange={(e) => setHoraAdministracion(e.target.value)}
              required
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-semibold text-black-2">
          Dosis administrada
          <input
            className="input-field"
            placeholder="Metformina 850mg"
            value={dosisAdministrada}
            onChange={(e) => setDosisAdministrada(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold text-black-2">
          Registrado por
          <input
            className="input-field"
            placeholder="Nombre del profesional de salud"
            value={registradoPor}
            onChange={(e) => setRegistradoPor(e.target.value)}
            required
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-black-2">
          <input
            type="checkbox"
            checked={tieneEvidenciaFoto}
            onChange={(e) => setTieneEvidenciaFoto(e.target.checked)}
            className="h-4 w-4 rounded border-black-4 accent-[#402F6C]"
          />
          Adjunté evidencia fotográfica (prescripción o herida)
        </label>
        <p className="-mt-2 text-xs text-black-4">
          La captura desde la cámara del dispositivo llega en una sesión futura del curso.
        </p>

        {error && <p className="text-sm text-status-red">{error}</p>}
        {exito && <p className="text-sm text-[#047e49]">Registro guardado correctamente.</p>}

        <button type="submit" className="btn-primary self-start" disabled={enviando || !pacienteId}>
          {enviando ? "Guardando…" : "Guardar registro"}
        </button>
      </form>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={null}>
      <FormularioRegistro />
    </Suspense>
  );
}
