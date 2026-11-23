"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { crearRegistro, ErrorDeRed, listarPacientes, type Paciente } from "@/lib/api";
import CapturaEvidencia, { type Evidencia } from "@/components/CapturaEvidencia";
import { guardarEvidencia, guardarPendiente } from "@/lib/db";
import { avisarCambioEnPendientes } from "@/lib/pendientes";
import { pedirSincronizacionEnSegundoPlano } from "@/lib/sync";

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
  const [evidencia, setEvidencia] = useState<Evidencia>({ foto: null, ubicacion: null });
  const [registradoPor, setRegistradoPor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    listarPacientes()
      .then(setPacientes)
      .catch(() => setError("No se pudo conectar con el servidor. Intenta de nuevo en unos segundos."));
  }, []);

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setExito(false);
    setAviso(null);
    setEnviando(true);
    const datos = {
      presionArterial,
      frecuenciaCardiaca: Number(frecuenciaCardiaca),
      temperatura: Number(temperatura),
      dosisAdministrada,
      horaAdministracion,
      tieneEvidenciaFoto: evidencia.foto !== null,
      registradoPor,
    };
    const limpiarCampos = () => {
      setPresionArterial("");
      setFrecuenciaCardiaca("");
      setTemperatura("");
      setDosisAdministrada("");
      setHoraAdministracion("");
      setEvidencia({ foto: null, ubicacion: null });
    };
    try {
      const registro = await crearRegistro(pacienteId, datos);
      if (evidencia.foto || evidencia.ubicacion) {
        await guardarEvidencia({ registroId: registro.id, ...evidencia, guardadaEn: Date.now() }).catch(() => {});
      }
      setExito(true);
      limpiarCampos();
      router.refresh();
    } catch (causa) {
      if (causa instanceof ErrorDeRed) {
        // Sin señal: el registro no se pierde, queda en este dispositivo y se envía al volver la conexión.
        try {
          const paciente = pacientes.find((p) => p.id === pacienteId);
          await guardarPendiente({
            pacienteId,
            pacienteNombre: paciente?.nombre ?? "Paciente",
            ...datos,
            foto: evidencia.foto,
            ubicacion: evidencia.ubicacion,
          });
          avisarCambioEnPendientes();
          void pedirSincronizacionEnSegundoPlano(); // Background Sync: se envía solo al volver la señal, incluso con la app cerrada
          setAviso("Sin conexión. Guardamos el registro en este dispositivo y lo enviaremos cuando vuelva la señal.");
          limpiarCampos();
        } catch {
          setError("No se pudo guardar el registro en este dispositivo. Intenta de nuevo.");
        }
      } else {
        setError("No se pudo guardar el registro. Intenta de nuevo.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">Registrar signos vitales</h1>
      </div>

      <form onSubmit={manejarEnvio} className="card flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
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
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
            Presión arterial
            <input
              className="input-field"
              placeholder="120/80"
              value={presionArterial}
              onChange={(e) => setPresionArterial(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
            Frecuencia cardíaca (lpm)
            <input
              className="input-field"
              type="number"
              value={frecuenciaCardiaca}
              onChange={(e) => setFrecuenciaCardiaca(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
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
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
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

        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Dosis administrada
          <input
            className="input-field"
            placeholder="Metformina 850mg"
            value={dosisAdministrada}
            onChange={(e) => setDosisAdministrada(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Registrado por
          <input
            className="input-field"
            placeholder="Nombre del profesional de salud"
            value={registradoPor}
            onChange={(e) => setRegistradoPor(e.target.value)}
            required
          />
        </label>

        <CapturaEvidencia valor={evidencia} onCambio={setEvidencia} />

        {error && <p className="text-sm text-peach-strong">{error}</p>}
        {exito && <p className="text-sm text-sage-strong">Registro guardado correctamente.</p>}
        {aviso && <p className="text-sm text-peach-strong">{aviso}</p>}

        <button type="submit" className="btn-primary scroll-mb-28 self-start" disabled={enviando || !pacienteId}>
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
