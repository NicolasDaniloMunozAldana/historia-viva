import Link from "next/link";
import BarraNotasPrivadas from "@/components/BarraNotasPrivadas";
import NotaPrivada from "@/components/NotaPrivada";
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
        <h1 className="font-heading text-2xl font-extrabold text-ink">Pacientes</h1>
        <Link href="/pacientes/nuevo" className="btn-primary">
          + Nuevo paciente
        </Link>
      </div>

      {error && (
        <div className="card border border-peach/30 text-sm text-peach-strong">
          No se pudo conectar con el servidor. Intenta de nuevo en unos segundos.
        </div>
      )}

      {!error && pacientes.length === 0 && (
        <div className="card text-sm text-ink/80">Aún no hay pacientes registrados.</div>
      )}

      {pacientes.length > 0 && <BarraNotasPrivadas />}

      <div className="flex flex-col gap-3">
        {pacientes.map((paciente) => (
          <article key={paciente.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-bold text-ink">{paciente.nombre}</h2>
                <p className="text-sm text-ink/80">{paciente.edad} años · {paciente.direccion}</p>
                {paciente.notas && <p className="mt-2 text-sm text-ink/80">{paciente.notas}</p>}
              </div>
              <Link
                href={`/registro?pacienteId=${paciente.id}`}
                className="badge shrink-0 border border-sage/40 bg-sage/10 text-ink"
              >
                Registrar
              </Link>
            </div>
            <NotaPrivada pacienteId={paciente.id} />
          </article>
        ))}
      </div>
    </div>
  );
}
