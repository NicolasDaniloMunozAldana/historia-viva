import Link from "next/link";
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
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-purple-3">
          Proyecto de grupo · Electiva PWA
        </p>
        <h1 className="mb-2 text-2xl font-extrabold text-purple-1 sm:text-3xl">
          El registro de un paciente no debería depender de si hay señal
        </h1>
        <p className="max-w-xl text-sm text-black-3">
          HistoriaViva es una aplicación instalable para que el personal de salud registre signos
          vitales y dosis durante visitas domiciliarias, incluso sin conexión a Internet.
        </p>
      </section>

      <section
        className={`card flex items-center gap-3 border ${
          conexionServidor ? "border-green-2" : "border-[#f2dbda]"
        }`}
      >
        <span
          className={`h-3 w-3 flex-shrink-0 rounded-full ${
            conexionServidor ? "bg-status-green" : "bg-status-red"
          }`}
          aria-hidden
        />
        <p className="text-sm text-black-2">
          {conexionServidor
            ? "Conectado con el servidor del centro de salud. Los registros se sincronizan al instante."
            : "Sin conexión con el servidor — en la versión final, los registros se guardan en el dispositivo y se sincronizan solos al recuperar señal."}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="card">
          <p className="text-xs font-bold uppercase text-purple-3">Pacientes</p>
          <p className="text-3xl font-extrabold text-purple-1">{pacientes.length}</p>
        </div>
        <div className="card">
          <p className="text-xs font-bold uppercase text-purple-3">Registros guardados</p>
          <p className="text-3xl font-extrabold text-purple-1">{registros.length}</p>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/registro" className="btn-primary">
          Registrar signos vitales
        </Link>
        <Link href="/pacientes" className="btn-secondary">
          Ver pacientes
        </Link>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold text-purple-1">Últimos registros</h2>
        {registros.length === 0 ? (
          <p className="text-sm text-black-3">Todavía no hay registros guardados.</p>
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
                    className="flex items-center justify-between rounded-2xl bg-lilac-1 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-black-2">
                        {paciente?.nombre ?? "Paciente"}
                      </p>
                      <p className="text-xs text-black-3">
                        {registro.presionArterial} · {registro.frecuenciaCardiaca} lpm · {registro.dosisAdministrada}
                      </p>
                    </div>
                    <span className="badge bg-green-2 text-[#047e49]">Sincronizado</span>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}
