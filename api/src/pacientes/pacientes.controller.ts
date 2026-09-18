import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PacientesService } from './pacientes.service.js';
import type { Paciente, RegistroSignos } from './paciente.model.js';

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
    >,
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
}
