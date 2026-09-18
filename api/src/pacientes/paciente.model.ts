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
