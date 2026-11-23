import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PacientesService } from './pacientes.service.js';
import type { EvidenciaServidor, Paciente, RegistroSignos } from './paciente.model.js';

@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  @Get()
  listar(): Paciente[] {
    return this.pacientesService.listarPacientes();
  }

  @Post()
  crear(@Body() datos: Pick<Paciente, 'nombre' | 'edad' | 'direccion' | 'notas'>): Paciente {
    return this.pacientesService.crearPaciente(datos);
  }

  @Get(':id')
  obtener(@Param('id') id: string): Paciente {
    return this.pacientesService.obtenerPaciente(id);
  }

  @Get(':id/registros')
  listarRegistros(@Param('id') id: string): RegistroSignos[] {
    return this.pacientesService.listarRegistros(id);
  }

  @Post(':id/registros')
  crearRegistro(
    @Param('id') id: string,
    @Body()
    datos: Pick<
      RegistroSignos,
      'presionArterial' | 'frecuenciaCardiaca' | 'temperatura' | 'dosisAdministrada' | 'horaAdministracion' | 'tieneEvidenciaFoto' | 'registradoPor'
    > & { idCliente?: string },
  ): RegistroSignos {
    return this.pacientesService.crearRegistro(id, datos);
  }
}

@Controller('registros')
export class RegistrosController {
  constructor(private readonly pacientesService: PacientesService) {}

  @Get()
  listar(@Query('pacienteId') pacienteId?: string): RegistroSignos[] {
    return this.pacientesService.listarRegistros(pacienteId);
  }

  // Evidencia (foto + ubicación) que el dispositivo sube al sincronizar. PUT: reenviarla la reemplaza.
  @Put(':id/evidencia')
  guardarEvidencia(
    @Param('id') id: string,
    @Body() datos: { foto?: string | null; ubicacion?: EvidenciaServidor['ubicacion'] },
  ): EvidenciaServidor {
    return this.pacientesService.guardarEvidencia(id, datos);
  }

  @Get(':id/evidencia')
  obtenerEvidencia(@Param('id') id: string): EvidenciaServidor {
    return this.pacientesService.obtenerEvidencia(id);
  }
}
