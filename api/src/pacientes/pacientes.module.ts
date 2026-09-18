import { Module } from '@nestjs/common';
import { PacientesController, RegistrosController } from './pacientes.controller.js';
import { PacientesService } from './pacientes.service.js';

@Module({
  controllers: [PacientesController, RegistrosController],
  providers: [PacientesService],
})
export class PacientesModule {}
