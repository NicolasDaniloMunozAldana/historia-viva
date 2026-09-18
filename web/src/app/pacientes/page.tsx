import Link from "next/link";
import { listarPacientes } from "@/lib/api";

export default async function PacientesPage() {
  let pacientes: Awaited<ReturnType<typeof listarPacientes>> = [];
  let error = false;

  try {
    pacientes = await listarPacientes();
  } catch {
    error = true;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-purple-1">Pacientes</h1>
        <Link href="/pacientes/nuevo" className="btn-primary">
          + Nuevo paciente
        </Link>
      </div>

      {error && (
        <div className="card border border-[#f2dbda] text-sm text-status-red">
          No se pudo conectar con el servidor. Verifica que la API de NestJS esté corriendo.
        </div>
      )}

      {!error && pacientes.length === 0 && (
        <div className="card text-sm text-black-3">Aún no hay pacientes registrados.</div>
      )}

      <div className="flex flex-col gap-3">
        {pacientes.map((paciente) => (
          <article key={paciente.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-purple-1">{paciente.nombre}</h2>
                <p className="text-sm text-black-3">{paciente.edad} años · {paciente.direccion}</p>
                {paciente.notas && <p className="mt-2 text-sm text-black-2">{paciente.notas}</p>}
              </div>
              <Link
                href={`/registro?pacienteId=${paciente.id}`}
                className="badge shrink-0 border border-purple-1 bg-white text-purple-1"
              >
                Registrar
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
