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
    avisar();
    return "creada";
  }
  if (await verificarClave(candidata, verificador)) {
    clave = candidata;
    avisar();
    return "desbloqueada";
  }
  return "incorrecta";
}

export function bloquearNotas() {
  clave = null;
  avisar();
}
