import { PushService } from './push.service.js';


describe('PushService', () => {
  let push: PushService;
  const suscripcion = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } };

  beforeEach(() => {
    process.env.HV_PUSH_FILE = ''; // sin archivo: cada prueba parte de cero
    push = new PushService();
  });

  it('genera una clave pública VAPID', () => {
    expect(push.clavePublica().length).toBeGreaterThan(40);
  });

  it('suscribir es idempotente por endpoint', () => {
    push.suscribir(suscripcion);
    push.suscribir(suscripcion);
    expect(push.cantidadSuscripciones()).toBe(1);
    push.cancelar(suscripcion.endpoint);
    expect(push.cantidadSuscripciones()).toBe(0);
  });

  it('rechaza una suscripción incompleta', () => {
    expect(() => push.suscribir({ endpoint: 'x' } as never)).toThrow();
  });

  it('solo envía los recordatorios que ya vencieron, y una sola vez', async () => {
    push.programarRecordatorio('Rosa', 'Metformina', 30);
    expect(await push.enviarRecordatoriosVencidos(Date.now())).toBe(0);
    expect(await push.enviarRecordatoriosVencidos(Date.now() + 31 * 60_000)).toBe(1);
    expect(await push.enviarRecordatoriosVencidos(Date.now() + 32 * 60_000)).toBe(0);
  });
});

describe('PushService · entrega al servicio push', () => {
  const resp = { statusCode: 201, body: '', headers: {} };

  it('envía la carga a cada suscripción con TTL, y retira la que responde 410', async () => {
    process.env.HV_PUSH_FILE = '';
    const push = new PushService();
    push.suscribir({ endpoint: 'https://push.example/buena', keys: { p256dh: 'p', auth: 'a' } });
    push.suscribir({ endpoint: 'https://push.example/caducada', keys: { p256dh: 'p', auth: 'a' } });
    const enviar = vi.fn(async (s: { endpoint: string }) => {
      if (s.endpoint.endsWith('/caducada')) throw Object.assign(new Error('Gone'), { statusCode: 410 });
      return resp;
    });
    push.enviarPush = enviar as unknown as typeof push.enviarPush;

    const entregados = await push.notificar({ titulo: 'Nuevo registro', cuerpo: 'Mileth registró a Rosa' });

    expect(entregados).toBe(1);
    expect(enviar).toHaveBeenCalledTimes(2);
    const [, carga, opciones] = enviar.mock.calls[0] as unknown as [unknown, string, { TTL: number }];
    expect(JSON.parse(carga)).toMatchObject({ titulo: 'Nuevo registro', url: '/' });
    expect(opciones.TTL).toBe(3600);
    expect(push.cantidadSuscripciones()).toBe(1); // la que respondió 410 se retiró
  });

  it('una caída transitoria (503) no retira la suscripción', async () => {
    process.env.HV_PUSH_FILE = '';
    const push = new PushService();
    push.suscribir({ endpoint: 'https://push.example/a', keys: { p256dh: 'p', auth: 'a' } });
    push.enviarPush = (async () => {
      throw Object.assign(new Error('caído'), { statusCode: 503 });
    }) as unknown as typeof push.enviarPush;
    expect(await push.notificar({ titulo: 't', cuerpo: 'c' })).toBe(0);
    expect(push.cantidadSuscripciones()).toBe(1);
  });
});
