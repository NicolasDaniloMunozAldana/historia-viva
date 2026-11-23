// Estado de la clave de las notas privadas. La CryptoKey (no exportable) solo vive en memoria: al
// recargar o cerrar la app hay que volver a escribir la contraseña. Nunca se guarda la contraseña.
import { useSyncExternalStore } from "react";
import {
  cifradoDisponible,
  crearVerificador,
  derivarClaveDesdeContrasena,
  generarSal,
  verificarClave,
} from "./crypto";
import type { TextoCifrado } from "./crypto";
import { guardarConfig, obtenerConfig } from "./db";

// Sesión temporal: las notas se bloquean solas tras unos minutos sin tocar la pantalla (o al ocultar la app),
// para que un dispositivo olvidado no deje los datos clínicos abiertos.
export const MINUTOS_SESION = 5;
const INACTIVIDAD_MS = MINUTOS_SESION * 60 * 1000;
let temporizador: ReturnType<typeof setTimeout> | undefined;
let motivoBloqueo: string | null = null;

let clave: CryptoKey | null = null;
const oyentes = new Set<() => void>();

function avisar() {
  oyentes.forEach((oyente) => oyente());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function obtenerClave(): CryptoKey | null {
  return clave;
}

export function useNotasDesbloqueadas(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => clave !== null,
    () => false,
  );
}

export type ResultadoDesbloqueo = "creada" | "desbloqueada" | "incorrecta" | "sin-cifrado";

export async function desbloquearNotas(contrasena: string): Promise<ResultadoDesbloqueo> {
  if (!cifradoDisponible()) return "sin-cifrado";

  let sal = await obtenerConfig<Uint8Array<ArrayBuffer>>("sal");
  const verificador = await obtenerConfig<TextoCifrado>("verificador");

  if (!sal) {
    // La sal no es secreta, pero sin ella ni la contraseña correcta reproduce la misma clave.
    sal = generarSal();
    await guardarConfig("sal", sal);
  }

  const candidata = await derivarClaveDesdeContrasena(contrasena, sal);

  if (!verificador) {
    await guardarConfig("verificador", await crearVerificador(candidata));
    clave = candidata;
    motivoBloqueo = null;
    vigilarActividad(true);
    reiniciarTemporizador();
    avisar();
    return "creada";
  }
  if (await verificarClave(candidata, verificador)) {
    clave = candidata;
    motivoBloqueo = null;
    vigilarActividad(true);
    reiniciarTemporizador();
    avisar();
    return "desbloqueada";
  }
  return "incorrecta";
}

/** Por qué se bloquearon solas las notas (null si las bloqueó la persona). Lo lee la barra para avisar. */
export function obtenerMotivoBloqueo(): string | null {
  return motivoBloqueo;
}

function reiniciarTemporizador() {
  clearTimeout(temporizador);
  if (clave) temporizador = setTimeout(() => bloquearNotas("inactividad"), INACTIVIDAD_MS);
}

const EVENTOS_ACTIVIDAD = ["pointerdown", "keydown", "scroll"] as const;
function alOcultarse() {
  if (document.visibilityState === "hidden" && clave) bloquearNotas("ocultar");
}
function vigilarActividad(activo: boolean) {
  if (typeof window === "undefined") return;
  for (const e of EVENTOS_ACTIVIDAD) {
    if (activo) window.addEventListener(e, reiniciarTemporizador, { passive: true });
    else window.removeEventListener(e, reiniciarTemporizador);
  }
  if (activo) document.addEventListener("visibilitychange", alOcultarse);
  else document.removeEventListener("visibilitychange", alOcultarse);
}

export function bloquearNotas(motivo: "inactividad" | "ocultar" | null = null) {
  clave = null;
  clearTimeout(temporizador);
  vigilarActividad(false);
  motivoBloqueo =
    motivo === "inactividad" ? `Las notas se bloquearon solas tras ${MINUTOS_SESION} min sin actividad.`
    : motivo === "ocultar" ? "Las notas se bloquearon al salir de la app."
    : null;
  avisar();
}
