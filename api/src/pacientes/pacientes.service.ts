import { Injectable, NotFoundException } from '@nestjs/common';
import type { Paciente, RegistroSignos } from './paciente.model.js';

@Injectable()
export class PacientesService {
  private pacientes: Paciente[] = [
    {
      id: crypto.randomUUID(),
      nombre: 'Rosa Martínez',
      edad: 74,
      direccion: 'Vereda El Roble, sector rural',
      notas: 'Hipertensión controlada. Visita domiciliaria semanal.',
      creadoEn: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      nombre: 'Jorge Iván Pérez',
      edad: 58,
      direccion: 'Vereda La Esperanza, sector rural',
      notas: 'Diabetes tipo 2. Requiere control de dosis de insulina.',
      creadoEn: new Date().toISOString(),
    },
  ];

  private registros: RegistroSignos[] = [];

  listarPacientes(): Paciente[] {
    return this.pacientes;
  }

  obtenerPaciente(id: string): Paciente {
    const paciente = this.pacientes.find((p) => p.id === id);
    if (!paciente) throw new NotFoundException('Paciente no encontrado');
    return paciente;
  }

  crearPaciente(datos: Pick<Paciente, 'nombre' | 'edad' | 'direccion' | 'notas'>): Paciente {
    const paciente: Paciente = {
      id: crypto.randomUUID(),
      creadoEn: new Date().toISOString(),
      ...datos,
    };
    this.pacientes.push(paciente);
    return paciente;
  }

  listarRegistros(pacienteId?: string): RegistroSignos[] {
    if (!pacienteId) return this.registros;
    return this.registros.filter((r) => r.pacienteId === pacienteId);
  }

  crearRegistro(
    pacienteId: string,
    datos: Pick<
      RegistroSignos,
      'presionArterial' | 'frecuenciaCardiaca' | 'temperatura' | 'dosisAdministrada' | 'horaAdministracion' | 'tieneEvidenciaFoto' | 'registradoPor'
    >,
  ): RegistroSignos {
    this.obtenerPaciente(pacienteId);
    const registro: RegistroSignos = {
      id: crypto.randomUUID(),
      pacienteId,
      sincronizado: true,
      creadoEn: new Date().toISOString(),
      ...datos,
    };
    this.registros.push(registro);
    return registro;
  }
}
