// Requerimiento nuevo del Product Owner (30/10/2026): aprobación de solicitudes
// de mayor monto. Cada bloque corresponde a un criterio de aceptación.
//
// Se mockean solo los repositorios y la transacción (que aquí solo ejecuta el
// trabajo): el service, la autorización y el patrón State corren de verdad.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as solicitudRepository from '../repositories/solicitud.repository.js';
import * as aprobacionRepository from '../repositories/aprobacion.repository.js';
import * as documentoRepository from '../repositories/documento.repository.js';
import * as notificacionRepository from '../repositories/notificacion.repository.js';
import * as solicitudService from '../services/solicitud.service.js';
import * as documentoService from '../services/documento.service.js';
import { DocumentoProxy } from '../patterns/structural/DocumentoProxy.js';
import { autorizarSolicitud as autorizarController } from '../controllers/solicitud.controller.js';
import {
  Solicitud,
  EstadoEnEvaluacion,
  EstadoPendienteAutorizacion,
  EstadoAprobada,
  TransicionInvalidaError,
} from '../patterns/state/index.js';

vi.mock('../repositories/solicitud.repository.js', () => ({
  findById: vi.fn(),
  actualizarEstado: vi.fn(),
  actualizarMonto: vi.fn(),
  listarEnEstado: vi.fn(),
  listarAsignadasA: vi.fn(),
  listarEnRevision: vi.fn(),
}));

vi.mock('../repositories/documento.repository.js', () => ({
  findById: vi.fn(),
  evaluadoresDeSolicitud: vi.fn(),
  listarDeSolicitud: vi.fn(),
}));

vi.mock('../repositories/usuario.repository.js', () => ({
  findById: vi.fn(async (id) => ({ id, nombre: 'Ana López' })),
}));

vi.mock('../repositories/notificacion.repository.js', () => ({
  registrar: vi.fn(async (aviso) => ({ id: 1, ...aviso })),
  marcarResultado: vi.fn(),
}));

vi.mock('../repositories/aprobacion.repository.js', () => ({
  ETAPAS: { EVALUACION: 'evaluacion', AUTORIZACION: 'autorizacion' },
  registrar: vi.fn(),
  listarDeSolicitud: vi.fn(),
}));

vi.mock('../config/transaccion.js', () => ({
  conTransaccion: async (trabajo) => trabajo(),
  db: () => ({}),
}));

// R3: cada operación se audita. Esta suite no ejecuta SQL.
vi.mock('../repositories/auditoria.repository.js', () => ({
  registrar: vi.fn(async () => ({ id: 1 })),
  listar: vi.fn(async () => []),
}));

const DUENO = { id: 3, rol: 'estudiante' };
const EVALUADOR = { id: 77, rol: 'evaluador' };
const AUTORIZADOR = { id: 88, rol: 'autorizador' };
const ADMIN = { id: 1, rol: 'administrador' };

function fila(estado, monto = '15000.00') {
  return { id: 42, estudiante_id: DUENO.id, estado, tipo: 'universitaria', monto_solicitado: monto };
}

/** La aprobación que el evaluador ya dio, tal como la devuelve el repositorio. */
const APROBO_EL_EVALUADOR = [{ usuarioId: EVALUADOR.id, etapa: 'evaluacion', resultado: 'aprobada' }];

function respuesta() {
  const res = { statusCode: 200 };
  res.status = vi.fn((c) => {
    res.statusCode = c;
    return res;
  });
  res.json = vi.fn((cuerpo) => {
    res.cuerpo = cuerpo;
    return res;
  });
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  solicitudRepository.actualizarEstado.mockResolvedValue({});
  documentoRepository.evaluadoresDeSolicitud.mockResolvedValue([EVALUADOR.id]);
  aprobacionRepository.registrar.mockImplementation(async (d) => d);
  aprobacionRepository.listarDeSolicitud.mockResolvedValue([]);
});

describe('una solicitud de más de Q10,000 necesita dos aprobaciones', () => {
  it('si el evaluador aprueba, queda Pendiente de Autorización y no Aprobada', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('En Evaluación', '15000.00'));

    const resultado = await solicitudService.dictaminarSolicitud(42, true, { usuario: EVALUADOR });

    expect(resultado.estado).toBe('Pendiente de Autorización');
    expect(resultado.accionesPermitidas).toEqual(['autorizar']);
    expect(solicitudRepository.actualizarEstado).toHaveBeenCalledWith(42, 'Pendiente de Autorización');
  });

  it('la autoridad autorizadora la aprueba y solo entonces queda Aprobada', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Pendiente de Autorización'));
    aprobacionRepository.listarDeSolicitud.mockResolvedValue(APROBO_EL_EVALUADOR);

    const resultado = await solicitudService.autorizarSolicitud(42, true, { usuario: AUTORIZADOR });

    expect(resultado.estado).toBe('Aprobada');
    expect(solicitudRepository.actualizarEstado).toHaveBeenCalledWith(42, 'Aprobada');
  });

  it('el umbral es estricto: Q10,000.01 ya necesita la segunda aprobación', () => {
    expect(solicitudService.requiereDobleAprobacion({ monto_solicitado: '10000.01' })).toBe(true);
  });
});

describe('una solicitud de Q10,000 o menos sigue el flujo vigente', () => {
  it('exactamente Q10,000 queda Aprobada con una sola aprobación', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('En Evaluación', '10000.00'));

    const resultado = await solicitudService.dictaminarSolicitud(42, true, { usuario: EVALUADOR });

    expect(resultado.estado).toBe('Aprobada');
  });

  it.each([
    ['5000.00', false],
    ['10000.00', false],
    ['10000.01', true],
    [null, false],
  ])('monto %s → requiere doble aprobación: %s', (monto, esperado) => {
    expect(solicitudService.requiereDobleAprobacion({ monto_solicitado: monto })).toBe(esperado);
  });
});

describe('no se autoriza mientras falte alguna de las aprobaciones', () => {
  it('autorizar una solicitud que el evaluador todavía no aprobó responde 409', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('En Evaluación'));

    await expect(solicitudService.autorizarSolicitud(42, true, { usuario: AUTORIZADOR })).rejects.toThrow(
      TransicionInvalidaError
    );
    expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();
  });

  it('desde En Evaluación no existe camino directo a Aprobada cuando se requiere autorización', () => {
    const solicitud = new Solicitud({ id: 1, estado: new EstadoEnEvaluacion() });
    solicitud.dictaminar(true, { requiereAutorizacion: true });

    expect(solicitud.estado).toBeInstanceOf(EstadoPendienteAutorizacion);
  });

  it('Pendiente de Autorización no admite otra acción que la autorización', () => {
    const solicitud = new Solicitud({ id: 1, estado: new EstadoPendienteAutorizacion() });

    expect(() => solicitud.dictaminar(true)).toThrow(TransicionInvalidaError);
    expect(() => solicitud.evaluar()).toThrow(TransicionInvalidaError);
    expect(() => solicitud.enviar()).toThrow(TransicionInvalidaError);
  });

  it('una solicitud ya Aprobada no se puede autorizar otra vez', () => {
    const solicitud = new Solicitud({ id: 1, estado: new EstadoAprobada() });

    expect(() => solicitud.autorizar(true)).toThrow(TransicionInvalidaError);
  });
});

describe('se registra quién aprobó, cuándo y con qué resultado', () => {
  it('el dictamen del evaluador queda registrado como la etapa de evaluación', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('En Evaluación'));

    await solicitudService.dictaminarSolicitud(42, true, { usuario: EVALUADOR });

    expect(aprobacionRepository.registrar).toHaveBeenCalledWith({
      solicitudId: 42,
      usuarioId: EVALUADOR.id,
      etapa: 'evaluacion',
      aprobado: true,
    });
  });

  it('la autorización queda registrada como la etapa de autorización', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Pendiente de Autorización'));
    aprobacionRepository.listarDeSolicitud.mockResolvedValue(APROBO_EL_EVALUADOR);

    await solicitudService.autorizarSolicitud(42, false, { usuario: AUTORIZADOR });

    expect(aprobacionRepository.registrar).toHaveBeenCalledWith({
      solicitudId: 42,
      usuarioId: AUTORIZADOR.id,
      etapa: 'autorizacion',
      aprobado: false,
    });
  });

  it('también se registra el dictamen de una solicitud de monto menor', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('En Evaluación', '3000.00'));

    await solicitudService.dictaminarSolicitud(42, false, { usuario: EVALUADOR });

    expect(aprobacionRepository.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ etapa: 'evaluacion', aprobado: false })
    );
  });

  it('el detalle de la solicitud muestra las aprobaciones registradas', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Pendiente de Autorización'));
    aprobacionRepository.listarDeSolicitud.mockResolvedValue([
      { usuarioId: 77, nombre: 'Evaluador', etapa: 'evaluacion', resultado: 'aprobada', creadoEn: new Date() },
    ]);

    const detalle = await solicitudService.obtenerSolicitud(42, DUENO);

    expect(detalle.aprobaciones).toHaveLength(1);
    expect(detalle.aprobaciones[0]).toMatchObject({ etapa: 'evaluacion', resultado: 'aprobada' });
  });

  it('si registrar la aprobación falla, la transición falla y no se avisa de nada', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('En Evaluación'));
    aprobacionRepository.registrar.mockRejectedValue(new Error('base de datos caída'));

    await expect(solicitudService.dictaminarSolicitud(42, true, { usuario: EVALUADOR })).rejects.toThrow(
      'base de datos caída'
    );
    expect(notificacionRepository.registrar).not.toHaveBeenCalled();
  });
});

describe('un rechazo deja la solicitud Rechazada y no continúa', () => {
  it('rechazada por el evaluador: no pasa a autorización, aunque supere el monto', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('En Evaluación', '15000.00'));

    const resultado = await solicitudService.dictaminarSolicitud(42, false, { usuario: EVALUADOR });

    expect(resultado.estado).toBe('Rechazada');
    expect(resultado.accionesPermitidas).toEqual([]);
  });

  it('rechazada por la autoridad autorizadora: queda Rechazada', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Pendiente de Autorización'));
    aprobacionRepository.listarDeSolicitud.mockResolvedValue(APROBO_EL_EVALUADOR);

    const resultado = await solicitudService.autorizarSolicitud(42, false, { usuario: AUTORIZADOR });

    expect(resultado.estado).toBe('Rechazada');
  });

  it('una Rechazada no se puede autorizar', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Rechazada'));

    await expect(solicitudService.autorizarSolicitud(42, true, { usuario: AUTORIZADOR })).rejects.toThrow(
      TransicionInvalidaError
    );
  });
});

describe('una misma persona no puede dar las dos aprobaciones', () => {
  it('quien aprobó como evaluador no puede autorizar, aunque tenga el rol de autorizador', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Pendiente de Autorización'));
    aprobacionRepository.listarDeSolicitud.mockResolvedValue([
      { usuarioId: AUTORIZADOR.id, etapa: 'evaluacion', resultado: 'aprobada' },
    ]);

    await expect(solicitudService.autorizarSolicitud(42, true, { usuario: AUTORIZADOR })).rejects.toMatchObject({
      status: 403,
      message: 'La misma persona no puede dar las dos aprobaciones.',
    });
    expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();
  });

  it.each([
    ['el evaluador', EVALUADOR],
    ['un administrador', ADMIN],
    ['el estudiante dueño', DUENO],
  ])('%s no puede autorizar: solo la autoridad autorizadora', async (_quien, usuario) => {
    solicitudRepository.findById.mockResolvedValue(fila('Pendiente de Autorización'));
    aprobacionRepository.listarDeSolicitud.mockResolvedValue(APROBO_EL_EVALUADOR);

    await expect(solicitudService.autorizarSolicitud(42, true, { usuario })).rejects.toMatchObject({ status: 403 });
  });

  it('el controller exige un booleano en "aprobado"', async () => {
    const res = respuesta();
    await autorizarController({ params: { id: '42' }, body: { aprobado: 'si' }, usuario: { sub: 88, rol: 'autorizador' } }, res);

    expect(res.statusCode).toBe(400);
  });
});

describe('el monto solicitado', () => {
  it('sin monto, la solicitud no se envía: así no se puede saltar la segunda aprobación', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Borrador', null));

    await expect(
      solicitudService.enviarSolicitud(42, { usuario: DUENO, cui: '1234567890101' })
    ).rejects.toMatchObject({ status: 400, message: 'Indique el monto que solicita antes de enviar la solicitud.' });
    expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();
  });

  it('el dueño lo fija en Borrador', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Borrador', null));
    solicitudRepository.actualizarMonto.mockResolvedValue(fila('Borrador', '15000.50'));

    const resultado = await solicitudService.establecerMonto(42, '15000.50', DUENO);

    expect(solicitudRepository.actualizarMonto).toHaveBeenCalledWith(42, 15000.5);
    expect(resultado).toMatchObject({ montoSolicitado: 15000.5, requiereDobleAprobacion: true });
  });

  it('nadie más que el dueño lo cambia', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Borrador', null));

    await expect(solicitudService.establecerMonto(42, 5000, { id: 99, rol: 'estudiante' })).rejects.toMatchObject({
      status: 403,
    });
  });

  it('una vez enviada, ya no se cambia: cambiaría cuántas aprobaciones necesita', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Enviada', '5000.00'));

    await expect(solicitudService.establecerMonto(42, 15000, DUENO)).rejects.toMatchObject({ status: 409 });
    expect(solicitudRepository.actualizarMonto).not.toHaveBeenCalled();
  });

  it.each([0, -5, 'abc', '', null, 1.234, 1e11])('rechaza un monto inválido: %s', async (monto) => {
    solicitudRepository.findById.mockResolvedValue(fila('Borrador', null));

    await expect(solicitudService.establecerMonto(42, monto, DUENO)).rejects.toMatchObject({ status: 400 });
    expect(solicitudRepository.actualizarMonto).not.toHaveBeenCalled();
  });
});

describe('la bandeja de la autoridad autorizadora', () => {
  it('trae las solicitudes que esperan su decisión', async () => {
    solicitudRepository.listarEnEstado.mockResolvedValue([fila('Pendiente de Autorización')]);

    const bandeja = await solicitudService.listarAsignadas(AUTORIZADOR);

    expect(solicitudRepository.listarEnEstado).toHaveBeenCalledWith('Pendiente de Autorización');
    expect(bandeja[0].accionesPermitidas).toEqual(['autorizar']);
  });

  it('puede ver una solicitud que espera su decisión, pero no las demás', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Pendiente de Autorización'));
    await expect(solicitudService.obtenerSolicitud(42, AUTORIZADOR)).resolves.toBeTruthy();

    solicitudRepository.findById.mockResolvedValue(fila('En Evaluación'));
    await expect(solicitudService.obtenerSolicitud(42, AUTORIZADOR)).rejects.toMatchObject({ status: 403 });
  });
});

describe('la autoridad autorizadora ve el expediente que va a autorizar, y solo ese', () => {
  const DOCUMENTO = { id: 500, solicitudId: 42, estudianteId: DUENO.id, tipo: 'dni', rutaArchivo: '/x.pdf' };

  it('el Proxy le da acceso solo mientras la solicitud espera su decisión', () => {
    expect(new DocumentoProxy(DOCUMENTO, AUTORIZADOR, { esperaAutorizacion: true }).tieneAcceso()).toBe(true);
    expect(new DocumentoProxy(DOCUMENTO, AUTORIZADOR).tieneAcceso()).toBe(false);
  });

  it('esperaAutorizacion no le abre el expediente a otros roles', () => {
    expect(new DocumentoProxy(DOCUMENTO, { id: 99, rol: 'estudiante' }, { esperaAutorizacion: true }).tieneAcceso()).toBe(
      false
    );
  });

  it.each([
    ['Pendiente de Autorización', true],
    ['En Evaluación', false],
    ['Aprobada', false],
  ])('el service resuelve el estado de la solicitud: %s → acceso %s', async (estado, esperado) => {
    documentoRepository.findById.mockResolvedValue(DOCUMENTO);
    solicitudRepository.findById.mockResolvedValue(fila(estado));

    const proxy = await documentoService.obtenerDocumento(500, AUTORIZADOR);

    expect(proxy.tieneAcceso()).toBe(esperado);
  });

  it('puede listar los documentos de una solicitud que espera su decisión, pero no de otra', async () => {
    documentoRepository.listarDeSolicitud.mockResolvedValue([DOCUMENTO]);

    solicitudRepository.findById.mockResolvedValue(fila('Pendiente de Autorización'));
    await expect(documentoService.listarDocumentos(42, AUTORIZADOR)).resolves.toMatchObject({ solicitudId: 42 });

    solicitudRepository.findById.mockResolvedValue(fila('Enviada'));
    await expect(documentoService.listarDocumentos(42, AUTORIZADOR)).rejects.toMatchObject({ status: 403 });
  });
});
