import { BadRequestException, Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { PushService, type SuscripcionPush } from './push.service.js';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  /** Clave pública VAPID: el navegador la necesita para crear la suscripción. */
  @Get('clave')
  clave(): { clave: string } {
    return { clave: this.push.clavePublica() };
  }

  @Post('suscripciones')
  suscribir(@Body() cuerpo: { suscripcion: SuscripcionPush }): { suscritos: number } {
    try {
      this.push.suscribir(cuerpo?.suscripcion);
    } catch {
      throw new BadRequestException('Suscripción incompleta');
    }
    return { suscritos: this.push.cantidadSuscripciones() };
  }

  @Delete('suscripciones')
  cancelar(@Body() cuerpo: { endpoint: string }): { suscritos: number } {
    this.push.cancelar(cuerpo?.endpoint);
    return { suscritos: this.push.cantidadSuscripciones() };
  }

  /** Aviso de prueba a todos los dispositivos suscritos. */
  @Post('prueba')
  async prueba(): Promise<{ entregados: number }> {
    const entregados = await this.push.notificar({
      titulo: 'HistoriaViva',
      cuerpo: 'Las notificaciones push funcionan: este aviso salió del servidor.',
      tag: 'prueba',
    });
    return { entregados };
  }
}
