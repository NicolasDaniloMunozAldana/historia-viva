// IndexedDB de HistoriaViva (Sesión 22): registros pendientes de envío (cola offline), notas privadas
// cifradas por paciente y configuración (sal + verificador de la contraseña de las notas).
//
// Esquema — cada pieza justificada por cómo se consulta:
//   pendientes  (keyPath id, autoIncrement)  índices: porPaciente, porCreadoEn
//       porCreadoEn  → enviar siempre en el orden en que se registraron.
//       porPaciente  → saber cuántos registros pendientes tiene un paciente concreto.
//   notas       (keyPath pacienteId)         una nota privada por paciente; la clave natural es el paciente.
//   config      (keyPath clave)              sal de PBKDF2 y verificador de contraseña.
//   evidencias  (keyPath registroId)         foto y ubicación de un registro ya enviado (Sesión 24, v2).
//       Los campos nuevos de un pendiente (foto, ubicacion) no llevan índice y no exigen migración;
//       lo que sí la exige (v1 -> v2) es el store nuevo `evidencias`.
import type { TextoCifrado } from "./crypto";

export const DB_NOMBRE = "historiaviva-db";
export const DB_VERSION = 2;

export interface Ubicacion {
  lat: number;
  lon: number;
  precision: number; // metros: "estoy aquí, con un margen de ±N m"
  momento: string;
}

export interface Evidencia {
  registroId: string;
  foto: Blob | null;
  ubicacion: Ubicacion | null;
  guardadaEn: number;
}

export interface RegistroPendiente {
  id?: number;
  pacienteId: string;
  pacienteNombre: string;
  presionArterial: string;
  frecuenciaCardiaca: number;
  temperatura: number;
  dosisAdministrada: string;
  horaAdministracion: string;
  tieneEvidenciaFoto: boolean;
  registradoPor: string;
  /** Id único generado en este dispositivo: el servidor lo usa para no duplicar un reenvío. */
  idCliente: string;
  /** Pedir al servidor un aviso push de «próxima dosis» dentro de N minutos (opcional). */
  recordarEnMinutos?: number;
  foto?: Blob | null;
  ubicacion?: Ubicacion | null;
  creadoEn: number;
  intentos: number;
  ultimoError: string | null;
}

export interface NotaPrivada extends TextoCifrado {
  pacienteId: string;
  actualizadaEn: number;
}

let conexion: Promise<IDBDatabase> | null = null;

export function abrirBaseDeDatos(): Promise<IDBDatabase> {
  if (conexion) return conexion;
  conexion = new Promise((resolve, reject) => {
    const peticion = indexedDB.open(DB_NOMBRE, DB_VERSION);

    peticion.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const version = event.oldVersion;
      if (version < 1) {
        const pendientes = db.createObjectStore("pendientes", { keyPath: "id", autoIncrement: true });
        pendientes.createIndex("porPaciente", "pacienteId", { unique: false });
        pendientes.createIndex("porCreadoEn", "creadoEn", { unique: false });
        db.createObjectStore("notas", { keyPath: "pacienteId" });
        db.createObjectStore("config", { keyPath: "clave" });
      }
      if (version < 2) {
        db.createObjectStore("evidencias", { keyPath: "registroId" });
      }
    };

    peticion.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      db.onversionchange = () => {
        db.close();
        conexion = null;
      };
      resolve(db);
    };
    peticion.onerror = (event) => {
      conexion = null;
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
  return conexion;
}

// Ejecuta una operación en una transacción y resuelve cuando la transacción COMPLETA (los datos ya
// están confirmados), rechazando con el error del propio request si falla.
async function enTransaccion<T>(
  stores: string | string[],
  modo: IDBTransactionMode,
  operacion: (tx: IDBTransaction) => IDBRequest<T> | undefined,
): Promise<T> {
  const db = await abrirBaseDeDatos();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(stores, modo);
    const peticion = operacion(tx);
    if (peticion) peticion.onerror = () => reject(peticion.error);
    tx.oncomplete = () => resolve(peticion?.result as T);
    tx.onabort = () => reject(tx.error);
  });
}

// --- Cola de registros pendientes ---

export function guardarPendiente(registro: Omit<RegistroPendiente, "id" | "intentos" | "ultimoError" | "creadoEn" | "idCliente">) {
  const completo: RegistroPendiente = { ...registro, idCliente: crypto.randomUUID(), creadoEn: Date.now(), intentos: 0, ultimoError: null };
  return enTransaccion<IDBValidKey>("pendientes", "readwrite", (tx) => tx.objectStore("pendientes").add(completo));
}

// El índice porCreadoEn entrega los registros ya ordenados del más antiguo al más reciente.
export function obtenerPendientes(): Promise<RegistroPendiente[]> {
  return enTransaccion<RegistroPendiente[]>("pendientes", "readonly", (tx) =>
    tx.objectStore("pendientes").index("porCreadoEn").getAll(),
  );
}

export function contarPendientes(): Promise<number> {
  return enTransaccion<number>("pendientes", "readonly", (tx) => tx.objectStore("pendientes").count());
}

export function eliminarPendiente(id: number): Promise<undefined> {
  return enTransaccion<undefined>("pendientes", "readwrite", (tx) => tx.objectStore("pendientes").delete(id));
}

export function registrarFalloDePendiente(pendiente: RegistroPendiente, mensaje: string) {
  const actualizado: RegistroPendiente = { ...pendiente, intentos: pendiente.intentos + 1, ultimoError: mensaje };
  return enTransaccion<IDBValidKey>("pendientes", "readwrite", (tx) => tx.objectStore("pendientes").put(actualizado));
}

// Saca un pendiente de la cola devolviéndolo completo, para poder deshacer el descarte.
export async function extraerPendiente(id: number): Promise<RegistroPendiente | undefined> {
  const pendiente = await enTransaccion<RegistroPendiente | undefined>("pendientes", "readonly", (tx) =>
    tx.objectStore("pendientes").get(id),
  );
  if (pendiente) await eliminarPendiente(id);
  return pendiente;
}

// Reinserta un pendiente descartado. IndexedDB le asigna un id nuevo (se descarta el viejo); conserva
// creadoEn, así que vuelve a su lugar en el orden de envío.
export function restaurarPendiente(pendiente: RegistroPendiente) {
  const copia: RegistroPendiente = { ...pendiente };
  delete copia.id;
  return enTransaccion<IDBValidKey>("pendientes", "readwrite", (tx) => tx.objectStore("pendientes").add(copia));
}

// --- Evidencias (foto + ubicación) de registros ya enviados ---

export function guardarEvidencia(evidencia: Evidencia) {
  return enTransaccion<IDBValidKey>("evidencias", "readwrite", (tx) => tx.objectStore("evidencias").put(evidencia));
}

export function obtenerEvidencia(registroId: string): Promise<Evidencia | undefined> {
  return enTransaccion<Evidencia | undefined>("evidencias", "readonly", (tx) =>
    tx.objectStore("evidencias").get(registroId),
  );
}

// --- Notas privadas (cifradas) ---

export function guardarNota(nota: NotaPrivada) {
  return enTransaccion<IDBValidKey>("notas", "readwrite", (tx) => tx.objectStore("notas").put(nota));
}

export function obtenerNota(pacienteId: string): Promise<NotaPrivada | undefined> {
  return enTransaccion<NotaPrivada | undefined>("notas", "readonly", (tx) => tx.objectStore("notas").get(pacienteId));
}

export function obtenerPacientesConNota(): Promise<IDBValidKey[]> {
  return enTransaccion<IDBValidKey[]>("notas", "readonly", (tx) => tx.objectStore("notas").getAllKeys());
}

// --- Configuración ---

export async function obtenerConfig<T>(clave: string): Promise<T | undefined> {
  const registro = await enTransaccion<{ clave: string; valor: T } | undefined>("config", "readonly", (tx) =>
    tx.objectStore("config").get(clave),
  );
  return registro?.valor;
}

export function guardarConfig(clave: string, valor: Uint8Array<ArrayBuffer> | TextoCifrado | string) {
  return enTransaccion<IDBValidKey>("config", "readwrite", (tx) => tx.objectStore("config").put({ clave, valor }));
}
