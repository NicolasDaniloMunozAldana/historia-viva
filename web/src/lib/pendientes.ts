// Cola offline: los registros que no se pudieron enviar por falta de conexión quedan en IndexedDB y se
// envían, del más antiguo al más reciente, cuando vuelve la señal.
import { crearRegistro, ErrorDeRed } from "./api";
import { eliminarPendiente, guardarEvidencia, obtenerPendientes, registrarFalloDePendiente } from "./db";

export const EVENTO_PENDIENTES_CAMBIARON = "hv:pendientes-cambiaron";
export const EVENTO_PENDIENTES_ENVIADOS = "hv:pendientes-enviados";

export function avisarCambioEnPendientes() {
  window.dispatchEvent(new Event(EVENTO_PENDIENTES_CAMBIARON));
}

// Envía lo pendiente y avisa a la interfaz (tarjeta de pendientes, refresco de datos del servidor).
export async function sincronizar(): Promise<number> {
  const enviados = await enviarPendientes();
  if (enviados > 0) window.dispatchEvent(new CustomEvent(EVENTO_PENDIENTES_ENVIADOS, { detail: enviados }));
  avisarCambioEnPendientes();
  return enviados;
}

let envioEnCurso: Promise<number> | null = null;

// Devuelve cuántos registros se enviaron. Si ya hay un envío en marcha (efecto doble de React, evento
// "online" + botón manual…) comparte esa misma ejecución para no duplicar registros.
export function enviarPendientes(): Promise<number> {
  if (envioEnCurso) return envioEnCurso;

  envioEnCurso = (async () => {
    let enviados = 0;
    for (const pendiente of await obtenerPendientes()) {
      try {
        const registro = await crearRegistro(pendiente.pacienteId, {
          presionArterial: pendiente.presionArterial,
          frecuenciaCardiaca: pendiente.frecuenciaCardiaca,
          temperatura: pendiente.temperatura,
          dosisAdministrada: pendiente.dosisAdministrada,
          horaAdministracion: pendiente.horaAdministracion,
          tieneEvidenciaFoto: pendiente.tieneEvidenciaFoto,
          registradoPor: pendiente.registradoPor,
        });
        // La foto y la ubicación no viajan al servidor: pasan a las evidencias del dispositivo, con el id real.
        if (pendiente.foto || pendiente.ubicacion) {
          await guardarEvidencia({
            registroId: registro.id,
            foto: pendiente.foto ?? null,
            ubicacion: pendiente.ubicacion ?? null,
            guardadaEn: Date.now(),
          });
        }
        await eliminarPendiente(pendiente.id!);
        enviados++;
      } catch (error) {
        if (error instanceof ErrorDeRed) break; // sigue sin señal: se conservan todos los demás
        // El servidor respondió con un error: el registro se conserva, con el motivo, para revisarlo.
        await registrarFalloDePendiente(pendiente, error instanceof Error ? error.message : "Error desconocido");
      }
    }
    return enviados;
  })().finally(() => {
    envioEnCurso = null;
  });

  return envioEnCurso;
}
