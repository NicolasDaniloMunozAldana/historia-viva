const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export interface Paciente {
  id: string;
  nombre: string;
  edad: number;
  direccion: string;
  notas?: string;
  creadoEn: string;
}

export interface RegistroSignos {
  id: string;
  pacienteId: string;
  presionArterial: string;
  frecuenciaCardiaca: number;
  temperatura: number;
  dosisAdministrada: string;
  horaAdministracion: string;
  tieneEvidenciaFoto: boolean;
  sincronizado: boolean;
  registradoPor: string;
  creadoEn: string;
}

async function solicitar<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: { "Content-Type": "application/json", ...opciones?.headers },
    cache: "no-store",
  });
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status} al llamar ${ruta}`);
  }
  return respuesta.json() as Promise<T>;
}

export function listarPacientes() {
  return solicitar<Paciente[]>("/pacientes");
}

export function obtenerPaciente(id: string) {
  return solicitar<Paciente>(`/pacientes/${id}`);
}

export function crearPaciente(datos: Pick<Paciente, "nombre" | "edad" | "direccion" | "notas">) {
  return solicitar<Paciente>("/pacientes", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function listarRegistros() {
  return solicitar<RegistroSignos[]>("/registros");
}

export function crearRegistro(
  pacienteId: string,
  datos: Pick<
    RegistroSignos,
    "presionArterial" | "frecuenciaCardiaca" | "temperatura" | "dosisAdministrada" | "horaAdministracion" | "tieneEvidenciaFoto" | "registradoPor"
  >,
) {
  return solicitar<RegistroSignos>(`/pacientes/${pacienteId}/registros`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}
