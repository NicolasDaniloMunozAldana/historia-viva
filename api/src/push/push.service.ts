import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface SuscripcionPush {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface AvisoPush {
  titulo: string;
  cuerpo: string;
  /** Ruta de la app que se abre al tocar la notificación. */
  url?: string;
  /** Mismo tag = la notificación nueva reemplaza a la anterior. */
  tag?: string;
}

interface Recordatorio {
  id: string;
  pacienteNombre: string;
  dosis: string;
  dispararEn: number;
  enviado: boolean;
}

interface EstadoPush {
  vapid?: { publica: string; privada: string };
  suscripciones: SuscripcionPush[];
  recordatorios: Recordatorio[];
}

/**
 * Notificaciones push (Web Push + VAPID). El SERVIDOR decide cuándo avisar —por eso funcionan con la app
 * cerrada—: el navegador solo entrega el mensaje al Service Worker, que muestra la notificación.
 *
 * Claves VAPID: se toman de VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (lo recomendado en producción, para que no
 * cambien al reiniciar); si no están, se generan una vez y se guardan junto a las suscripciones.
 */
@Injectable()
export class PushService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PushService.name);
  private readonly archivo = process.env.HV_PUSH_FILE ?? 'data/push.json';
  private estado: EstadoPush = { suscripciones: [], recordatorios: [] };
  /** Función que entrega el mensaje al servicio push del navegador. Es un campo para poder sustituirla en las pruebas. */
  enviarPush: typeof webpush.sendNotification = (...args) => webpush.sendNotification(...args);
  private temporizador?: ReturnType<typeof setInterval>;

  constructor() {
    this.cargar();
    const publica = process.env.VAPID_PUBLIC_KEY ?? this.estado.vapid?.publica;
    const privada = process.env.VAPID_PRIVATE_KEY ?? this.estado.vapid?.privada;
    if (publica && privada) {
      this.estado.vapid = { publica, privada };
    } else {
      const claves = webpush.generateVAPIDKeys();
      this.estado.vapid = { publica: claves.publicKey, privada: claves.privateKey };
      this.guardar();
    }
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:historiaviva@example.com', this.estado.vapid.publica, this.estado.vapid.privada);
  }

  onModuleInit() {
    // Cada 15 s se revisan los recordatorios que ya vencieron.
    this.temporizador = setInterval(() => void this.enviarRecordatoriosVencidos(), 15_000);
    this.temporizador.unref();
  }

  onModuleDestroy() {
    clearInterval(this.temporizador);
  }

  private cargar() {
    if (!this.archivo || !existsSync(this.archivo)) return;
    try {
      this.estado = { suscripciones: [], recordatorios: [], ...(JSON.parse(readFileSync(this.archivo, 'utf8')) as Partial<EstadoPush>) };
    } catch {
      this.log.warn(`No se pudo leer ${this.archivo}: se empieza sin suscripciones.`);
    }
  }

  private guardar() {
    if (!this.archivo) return;
    try {
      mkdirSync(dirname(this.archivo), { recursive: true });
      writeFileSync(this.archivo, JSON.stringify(this.estado));
    } catch (error) {
      this.log.error(`No se pudo guardar ${this.archivo}: ${String(error)}`);
    }
  }

  clavePublica(): string {
    return this.estado.vapid!.publica;
  }

  cantidadSuscripciones(): number {
    return this.estado.suscripciones.length;
  }

  /** Guarda (o actualiza) la suscripción de un dispositivo. Idempotente: el endpoint es único. */
  suscribir(suscripcion: SuscripcionPush): void {
    if (!suscripcion?.endpoint || !suscripcion.keys?.p256dh || !suscripcion.keys?.auth) {
      throw new Error('Suscripción incompleta');
    }
    this.estado.suscripciones = this.estado.suscripciones.filter((s) => s.endpoint !== suscripcion.endpoint);
    this.estado.suscripciones.push(suscripcion);
    this.guardar();
  }

  cancelar(endpoint: string): void {
    this.estado.suscripciones = this.estado.suscripciones.filter((s) => s.endpoint !== endpoint);
    this.guardar();
  }

  /** Envía un aviso a todos los dispositivos suscritos. Devuelve a cuántos se entregó. */
  async notificar(aviso: AvisoPush): Promise<number> {
    const carga = JSON.stringify({ url: '/', tag: 'historiaviva', ...aviso });
    let entregados = 0;
    for (const suscripcion of [...this.estado.suscripciones]) {
      try {
        await this.enviarPush(suscripcion, carga, { TTL: 60 * 60 });
        entregados++;
      } catch (error) {
        const codigo = (error as { statusCode?: number }).statusCode;
        // 404/410: el navegador ya no reconoce esa suscripción (la app se desinstaló o se revocó el permiso).
        if (codigo === 404 || codigo === 410) this.cancelar(suscripcion.endpoint);
        else this.log.warn(`Push a ${suscripcion.endpoint.slice(0, 40)}… falló (${codigo ?? String(error)})`);
      }
    }
    return entregados;
  }

  /** Programa el aviso de «próxima dosis» dentro de N minutos (se guarda: sobrevive a un reinicio). */
  programarRecordatorio(pacienteNombre: string, dosis: string, enMinutos: number): void {
    if (!(enMinutos > 0)) return;
    this.estado.recordatorios.push({ id: crypto.randomUUID(), pacienteNombre, dosis, dispararEn: Date.now() + enMinutos * 60_000, enviado: false });
    this.guardar();
  }

  async enviarRecordatoriosVencidos(ahora = Date.now()): Promise<number> {
    const vencidos = this.estado.recordatorios.filter((r) => !r.enviado && r.dispararEn <= ahora);
    for (const r of vencidos) {
      r.enviado = true;
      await this.notificar({ titulo: 'Próxima dosis', cuerpo: `${r.pacienteNombre}: ${r.dosis}`, url: '/registro', tag: `dosis-${r.id}` });
    }
    if (vencidos.length > 0) {
      // Se conservan solo los pendientes y los de las últimas 24 h, para que el archivo no crezca sin límite.
      this.estado.recordatorios = this.estado.recordatorios.filter((r) => !r.enviado || r.dispararEn > ahora - 24 * 3600_000);
      this.guardar();
    }
    return vencidos.length;
  }
}
