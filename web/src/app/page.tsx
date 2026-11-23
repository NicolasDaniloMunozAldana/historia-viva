import Link from "next/link";
import EstadoConexion from "@/components/EstadoConexion";
import AvisosPush from "@/components/AvisosPush";
import InstalarApp from "@/components/InstalarApp";
import EvidenciaRegistro from "@/components/EvidenciaRegistro";
import PendientesCard from "@/components/PendientesCard";
import { listarPacientes, listarRegistros } from "@/lib/api";

export default async function InicioPage() {
  let pacientes: Awaited<ReturnType<typeof listarPacientes>> = [];
  let registros: Awaited<ReturnType<typeof listarRegistros>> = [];
  let conexionServidor = true;

  try {
    [pacientes, registros] = await Promise.all([listarPacientes(), listarRegistros()]);
  } catch {
    conexionServidor = false;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="px-1">
        <h1 className="mb-2 font-heading text-2xl font-extrabold text-ink sm:text-3xl">
          El registro de un paciente no debería depender de si hay señal
        </h1>
        <p className="max-w-xl text-sm text-ink/80">
          HistoriaViva es una aplicación instalable para que el personal de salud registre signos
          vitales y dosis durante visitas domiciliarias, incluso sin conexión a Internet.
        </p>
      </section>

      <EstadoConexion servidorAlcanzable={conexionServidor} />

      <section className="grid grid-cols-2 gap-4">
        <div className="card">
          <p className="text-xs font-bold uppercase text-ink/80">Pacientes</p>
          <p className="font-heading text-3xl font-extrabold text-ink">{pacientes.length}</p>
        </div>
        <div className="card">
          <p className="text-xs font-bold uppercase text-ink/80">Registros guardados</p>
          <p className="font-heading text-3xl font-extrabold text-ink">{registros.length}</p>
        </div>
      </section>

      <InstalarApp />

      <AvisosPush />

      <PendientesCard />

      <section className="flex flex-wrap gap-3">
        <Link href="/registro" className="btn-primary">
          Registrar signos vitales
        </Link>
        <Link href="/pacientes" className="btn-secondary">
          Ver pacientes
        </Link>
      </section>

      <section className="card">
        <h2 className="mb-3 font-heading text-lg font-bold text-ink">Últimos registros</h2>
        {registros.length === 0 ? (
          <p className="text-sm text-ink/80">Todavía no hay registros guardados.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {registros
              .slice(-5)
              .reverse()
              .map((registro) => {
                const paciente = pacientes.find((p) => p.id === registro.pacienteId);
                return (
                  <li
                    key={registro.id}
                    className="flex items-center justify-between rounded-2xl bg-sage/10 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {paciente?.nombre ?? "Paciente"}
                      </p>
                      <p className="text-xs text-ink/80">
                        {registro.presionArterial} · {registro.frecuenciaCardiaca} lpm · {registro.dosisAdministrada}
                      </p>
                      <EvidenciaRegistro registroId={registro.id} />
                    </div>
                    <span className="badge bg-sage/20 text-ink">Sincronizado</span>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}
