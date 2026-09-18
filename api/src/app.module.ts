import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PacientesModule } from './pacientes/pacientes.module.js';

@Module({
  imports: [PacientesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
