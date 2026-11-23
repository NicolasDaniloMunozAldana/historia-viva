import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { EvidenciaServidor, Paciente, RegistroSignos } from './paciente.model.js';

type DatosRegistro = Pick<
  RegistroSignos,
  'presionArterial' | 'frecuenciaCardiaca' | 'temperatura' | 'dosisAdministrada' | 'horaAdministracion' | 'tieneEvidenciaFoto' | 'registradoPor'
> & { idCliente?: string };

interface Estado {
  pacientes: Paciente[];
  registros: RegistroSignos[];
  evidencias: EvidenciaServidor[];
}

// Tope de una foto (data URL): evita que un cliente llene la memoria del servidor.
const MAX_FOTO_CARACTERES = 6_000_000;

@Injectable()
export class PacientesService {
  private readonly log = new Logger(PacientesService.name);
  // Persistencia simple en un archivo JSON (HV_DATA_FILE; "" la desactiva, útil en pruebas). Sin ella el
  // servidor del centro de salud perdería todo al reiniciarse.
  private readonly archivo = process.env.HV_DATA_FILE ?? 'data/historiaviva.json';

  private pacientes: Paciente[] = [];
  private registros: RegistroSignos[] = [];
  private evidencias: EvidenciaServidor[] = [];

  constructor() {
    if (!this.cargar()) {
      this.pacientes = [
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
      this.guardar();
    }
  }

  private cargar(): boolean {
    if (!this.archivo || !existsSync(this.archivo)) return false;
    try {
      const e = JSON.parse(readFileSync(this.archivo, 'utf8')) as Partial<Estado>;
      this.pacientes = e.pacientes ?? [];
      this.registros = e.registros ?? [];
      this.evidencias = e.evidencias ?? [];
      return this.pacientes.length > 0;
    } catch (error) {
      this.log.warn(`No se pudo leer ${this.archivo}: se empieza con datos de ejemplo.`);
      return false;
    }
  }

  private guardar(): void {
    if (!this.archivo) return;
    try {
      mkdirSync(dirname(this.archivo), { recursive: true });
      const estado: Estado = { pacientes: this.pacientes, registros: this.registros, evidencias: this.evidencias };
      writeFileSync(this.archivo, JSON.stringify(estado));
    } catch (error) {
      this.log.error(`No se pudo guardar ${this.archivo}: ${String(error)}`);
    }
  }

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
    this.guardar();
    return paciente;
  }

  listarRegistros(pacienteId?: string): RegistroSignos[] {
    if (!pacienteId) return this.registros;
    return this.registros.filter((r) => r.pacienteId === pacienteId);
  }

  /**
   * Regla de sincronización (conflictos): los registros son un historial que SOLO CRECE. Dos cuidadores que
   * anotan al mismo paciente a la vez producen dos registros distintos y ambos se conservan (cada uno con su
   * «registradoPor» y su hora): nunca se pisa un dato. Lo único que se descarta es el REENVÍO del mismo
   * registro (mismo idCliente), que ocurre si la conexión se cae justo después de que el servidor lo recibió.
   */
  crearRegistro(pacienteId: string, datos: DatosRegistro): RegistroSignos {
    this.obtenerPaciente(pacienteId);
    if (datos.idCliente) {
      const existente = this.registros.find((r) => r.pacienteId === pacienteId && r.idCliente === datos.idCliente);
      if (existente) return existente;
    }
    const registro: RegistroSignos = {
      id: crypto.randomUUID(),
      pacienteId,
      sincronizado: true,
      creadoEn: new Date().toISOString(),
      ...datos,
    };
    this.registros.push(registro);
    this.guardar();
    return registro;
  }

  guardarEvidencia(registroId: string, datos: { foto?: string | null; ubicacion?: EvidenciaServidor['ubicacion'] }): EvidenciaServidor {
    if (!this.registros.some((r) => r.id === registroId)) throw new NotFoundException('Registro no encontrado');
    if (datos.foto) {
      if (!/^data:image\/(jpeg|png|webp);base64,/.test(datos.foto)) throw new BadRequestException('La foto debe ser una imagen (data URL).');
      if (datos.foto.length > MAX_FOTO_CARACTERES) throw new BadRequestException('La foto es demasiado grande.');
    }
    const evidencia: EvidenciaServidor = {
      registroId,
      foto: datos.foto ?? null,
      ubicacion: datos.ubicacion ?? null,
      recibidaEn: new Date().toISOString(),
    };
    // Idempotente: reenviar la evidencia de un registro la reemplaza, no la duplica.
    this.evidencias = this.evidencias.filter((e) => e.registroId !== registroId);
    this.evidencias.push(evidencia);
    this.guardar();
    return evidencia;
  }

  obtenerEvidencia(registroId: string): EvidenciaServidor {
    const evidencia = this.evidencias.find((e) => e.registroId === registroId);
    if (!evidencia) throw new NotFoundException('Ese registro no tiene evidencia en el servidor');
    return evidencia;
  }
}
