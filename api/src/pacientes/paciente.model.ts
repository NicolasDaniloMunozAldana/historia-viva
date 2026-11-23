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
  /** Id generado en el dispositivo: permite reenviar sin duplicar (idempotencia). */
  idCliente?: string;
  creadoEn: string;
}

export interface EvidenciaServidor {
  registroId: string;
  /** Foto como data URL (image/jpeg;base64,...). */
  foto: string | null;
  ubicacion: { lat: number; lon: number; precision: number; momento: string } | null;
  recibidaEn: string;
}
