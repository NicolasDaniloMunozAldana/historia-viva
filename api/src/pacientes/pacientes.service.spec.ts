import { PacientesService } from './pacientes.service.js';

const datos = {
  presionArterial: '120/80',
  frecuenciaCardiaca: 72,
  temperatura: 36.6,
  dosisAdministrada: 'Metformina 850mg',
  horaAdministracion: '08:00',
  tieneEvidenciaFoto: false,
  registradoPor: 'Mileth',
};

describe('PacientesService', () => {
  let servicio: PacientesService;
  let pacienteId: string;

  beforeEach(() => {
    process.env.HV_DATA_FILE = ''; // sin archivo: cada prueba parte de cero
    servicio = new PacientesService();
    pacienteId = servicio.listarPacientes()[0].id;
  });

  it('reenviar el mismo registro (mismo idCliente) no lo duplica', () => {
    const a = servicio.crearRegistro(pacienteId, { ...datos, idCliente: 'abc' });
    const b = servicio.crearRegistro(pacienteId, { ...datos, idCliente: 'abc' });
    expect(b.id).toBe(a.id);
    expect(servicio.listarRegistros(pacienteId)).toHaveLength(1);
  });

  it('dos cuidadores que anotan al mismo paciente conservan ambos registros', () => {
    servicio.crearRegistro(pacienteId, { ...datos, idCliente: 'uno', registradoPor: 'Mileth' });
    servicio.crearRegistro(pacienteId, { ...datos, idCliente: 'dos', registradoPor: 'Nicolás' });
    expect(servicio.listarRegistros(pacienteId).map((r) => r.registradoPor)).toEqual(['Mileth', 'Nicolás']);
  });

  it('guarda la evidencia y reenviarla la reemplaza', () => {
    const r = servicio.crearRegistro(pacienteId, datos);
    servicio.guardarEvidencia(r.id, { foto: 'data:image/jpeg;base64,AAAA', ubicacion: null });
    servicio.guardarEvidencia(r.id, { foto: 'data:image/jpeg;base64,BBBB', ubicacion: null });
    expect(servicio.obtenerEvidencia(r.id).foto).toBe('data:image/jpeg;base64,BBBB');
  });

  it('rechaza una evidencia que no es una imagen', () => {
    const r = servicio.crearRegistro(pacienteId, datos);
    expect(() => servicio.guardarEvidencia(r.id, { foto: 'data:text/html;base64,AAAA' })).toThrow();
  });

  it('rechaza un registro de un paciente que no existe', () => {
    expect(() => servicio.crearRegistro('no-existe', datos)).toThrow();
  });
});
