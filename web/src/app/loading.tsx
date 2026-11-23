// Feedback de carga (Sesión 23): mientras Next resuelve la página en el servidor, se muestra la forma
// del contenido en vez de una pantalla vacía que parezca congelada.
export default function Cargando() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-3/4 rounded-xl bg-ink/10" />
      <div className="h-16 rounded-3xl bg-ink/5" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-24 rounded-3xl bg-ink/5" />
        <div className="h-24 rounded-3xl bg-ink/5" />
      </div>
      <div className="h-40 rounded-3xl bg-ink/5" />
    </div>
  );
}
