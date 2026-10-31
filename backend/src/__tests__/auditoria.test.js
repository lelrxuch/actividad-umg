// Requerimiento nuevo del Product Owner (30/10/2026): auditoría de operaciones
// relevantes. Cada bloque corresponde a un criterio de aceptación.
//
// Se mockean los repositorios y la transacción (que aquí solo ejecuta el
// trabajo). Que la auditoría sea inmutable lo garantiza un trigger de
// PostgreSQL, y eso solo se puede probar contra la base real: lo hace
// scripts/demo-api.sh, paso 15d.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as auditoriaRepository from '../repositories/auditoria.repository.js';
import * as solicitudRepository from '../repositories/solicitud.repository.js';
import * as documentoRepository from '../repositories/documento.repository.js';
import * as usuarioRepository from '../repositories/usuario.repository.js';
import * as notificacionRepository from '../repositories/notificacion.repository.js';
import * as aprobacionRepository from '../repositories/aprobacion.repository.js';
import * as solicitudService from '../services/solicitud.service.js';
import * as documentoService from '../services/documento.service.js';
import { auditar, consultar, enmascararCui, OPERACIONES } from '../services/auditoria.service.js';
import { consultar as consultarController } from '../controllers/auditoria.controller.js';

vi.mock('../repositories/auditoria.repository.js', () => ({
  registrar: vi.fn(),
  listar: vi.fn(),
}));

vi.mock('../repositories/solicitud.repository.js', () => ({
  findById: vi.fn(),
  actualizarEstado: vi.fn(),
  actualizarMonto: vi.fn(),
  asignarEvaluador: vi.fn(),
}));

vi.mock('../repositories/documento.repository.js', () => ({
  evaluadoresDeSolicitud: vi.fn(),
  listarDeSolicitud: vi.fn(),
  crear: vi.fn(),
}));

vi.mock('../repositories/usuario.repository.js', () => ({
  findById: vi.fn(),
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

vi.mock('../services/convocatoria.service.js', () => ({
  exigirConvocatoriaAbierta: vi.fn(),
}));

vi.mock('../config/transaccion.js', () => ({
  conTransaccion: async (trabajo) => trabajo(),
  db: () => ({}),
}));

const CUI_ANA = '1234567890101';
const DUENO = { id: 3, rol: 'estudiante' };
const EVALUADOR = { id: 77, rol: 'evaluador' };
const AUTORIZADOR = { id: 88, rol: 'autorizador' };
const ADMIN = { id: 1, rol: 'administrador' };

function fila(estado, extra = {}) {
  return { id: 42, estudiante_id: DUENO.id, estado, tipo: 'universitaria', monto_solicitado: '5000.00', ...extra };
}

/** Los registros de auditoría que se pidieron guardar, en orden. */
function registros() {
  return auditoriaRepository.registrar.mock.calls.map((c) => c[0]);
}

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
  auditoriaRepository.registrar.mockResolvedValue({ id: 1 });
  auditoriaRepository.listar.mockResolvedValue([]);
  solicitudRepository.actualizarEstado.mockResolvedValue({});
  documentoRepository.evaluadoresDeSolicitud.mockResolvedValue([EVALUADOR.id]);
  documentoRepository.listarDeSolicitud.mockResolvedValue([
    { tipo: 'dni' },
    { tipo: 'titulo' },
    { tipo: 'carta' },
  ]);
  usuarioRepository.findById.mockResolvedValue({ id: DUENO.id, nombre: 'Ana López' });
  aprobacionRepository.registrar.mockImplementation(async (d) => d);
  aprobacionRepository.listarDeSolicitud.mockResolvedValue([]);
});

describe('se audita cada operación relevante, con usuario, operación y solicitud', () => {
  it('cambio de estado: el anterior y el nuevo', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Enviada'));

    await solicitudService.evaluarSolicitud(42, { usuario: EVALUADOR });

    expect(registros()).toEqual([
      {
        usuarioId: EVALUADOR.id,
        operacion: 'cambio_estado',
        solicitudId: 42,
        detalle: { campo: 'estado', antes: 'Enviada', despues: 'En Evaluación' },
      },
    ]);
  });

  it('dictamen: el cambio de estado y la aprobación, con su etapa y resultado', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('En Evaluación'));

    await solicitudService.dictaminarSolicitud(42, false, { usuario: EVALUADOR });

    expect(registros().map((r) => [r.operacion, r.detalle])).toEqual([
      ['cambio_estado', { campo: 'estado', antes: 'En Evaluación', despues: 'Rechazada' }],
      ['aprobacion', { etapa: 'evaluacion', resultado: 'rechazada' }],
    ]);
  });

  it('autorización: la segunda etapa queda con su propio autor', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Pendiente de Autorización', { monto_solicitado: '15000.00' }));
    aprobacionRepository.listarDeSolicitud.mockResolvedValue([{ usuarioId: EVALUADOR.id, etapa: 'evaluacion' }]);

    await solicitudService.autorizarSolicitud(42, true, { usuario: AUTORIZADOR });

    const aprobacion = registros().find((r) => r.operacion === 'aprobacion');
    expect(aprobacion).toEqual({
      usuarioId: AUTORIZADOR.id,
      operacion: 'aprobacion',
      solicitudId: 42,
      detalle: { etapa: 'autorizacion', resultado: 'aprobada' },
    });
  });

  it('cambio de monto: qué dato cambió, su valor anterior y el nuevo', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Borrador', { monto_solicitado: '5000.00' }));
    solicitudRepository.actualizarMonto.mockResolvedValue(fila('Borrador', { monto_solicitado: '15000.00' }));

    await solicitudService.establecerMonto(42, 15000, DUENO);

    expect(registros()).toEqual([
      {
        usuarioId: DUENO.id,
        operacion: 'cambio_monto',
        solicitudId: 42,
        detalle: { campo: 'monto_solicitado', antes: 5000, despues: 15000 },
      },
    ]);
  });

  it('el primer monto queda con antes: null', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Borrador', { monto_solicitado: null }));
    solicitudRepository.actualizarMonto.mockResolvedValue(fila('Borrador'));

    await solicitudService.establecerMonto(42, 5000, DUENO);

    expect(registros()[0].detalle).toEqual({ campo: 'monto_solicitado', antes: null, despues: 5000 });
  });

  it('asignación de evaluador: a quién se asignó', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Enviada'));
    usuarioRepository.findById.mockResolvedValue({ id: 77, rol: 'evaluador', nombre: 'Eva Luadora', email: 'e@x' });
    solicitudRepository.asignarEvaluador.mockResolvedValue(true);

    await solicitudService.asignarEvaluador(42, 77, ADMIN);

    expect(registros()).toEqual([
      {
        usuarioId: ADMIN.id,
        operacion: 'asignacion_evaluador',
        solicitudId: 42,
        detalle: { evaluadorId: 77, evaluadorNombre: 'Eva Luadora' },
      },
    ]);
  });

  it('una asignación repetida (409) no deja registro', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Enviada'));
    usuarioRepository.findById.mockResolvedValue({ id: 77, rol: 'evaluador', nombre: 'Eva' });
    solicitudRepository.asignarEvaluador.mockResolvedValue(false);

    await expect(solicitudService.asignarEvaluador(42, 77, ADMIN)).rejects.toMatchObject({ status: 409 });
    expect(auditoriaRepository.registrar).not.toHaveBeenCalled();
  });

  it('subida de documento: el tipo y el nombre del archivo', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Borrador'));
    documentoRepository.listarDeSolicitud.mockResolvedValue([]);
    documentoRepository.crear.mockImplementation(async (d) => ({ id: 9, ...d }));

    await documentoService.subirDocumento(
      { solicitudId: 42, tipo: 'dni', archivo: { nombreOriginal: 'dpi.pdf', contenido: Buffer.from('x') }, usuario: DUENO },
      { almacenamiento: async () => 'exp/42/a.pdf' }
    );

    expect(registros()).toEqual([
      {
        usuarioId: DUENO.id,
        operacion: 'subida_documento',
        solicitudId: 42,
        detalle: { tipo: 'dni', nombreArchivo: 'dpi.pdf' },
      },
    ]);
  });

  it('envío: el cambio de estado y la validación de identidad, con el CUI enmascarado', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Borrador'));

    await solicitudService.enviarSolicitud(42, { usuario: DUENO, cui: CUI_ANA });

    const identidad = registros().find((r) => r.operacion === 'validacion_identidad');
    expect(identidad.detalle).toEqual({ cui: '*********0101', resultado: 'valida' });
    expect(JSON.stringify(registros())).not.toContain(CUI_ANA);
  });

  it('una transición rechazada por el estado (409) no deja registro', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Aprobada'));

    await expect(solicitudService.evaluarSolicitud(42, { usuario: EVALUADOR })).rejects.toMatchObject({ status: 409 });
    expect(auditoriaRepository.registrar).not.toHaveBeenCalled();
  });
});

describe('no hay operación sin su rastro', () => {
  it('si la auditoría falla, la operación falla y no se avisa al estudiante', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Enviada'));
    auditoriaRepository.registrar.mockRejectedValue(new Error('auditoría caída'));

    await expect(solicitudService.evaluarSolicitud(42, { usuario: EVALUADOR })).rejects.toThrow('auditoría caída');
    expect(notificacionRepository.registrar).not.toHaveBeenCalled();
  });

  it('si falla al cambiar el monto, el error llega al cliente', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Borrador'));
    solicitudRepository.actualizarMonto.mockResolvedValue(fila('Borrador'));
    auditoriaRepository.registrar.mockRejectedValue(new Error('auditoría caída'));

    await expect(solicitudService.establecerMonto(42, 7000, DUENO)).rejects.toThrow('auditoría caída');
  });

  it('un registro sin autor no se acepta', async () => {
    await expect(auditar(OPERACIONES.CAMBIO_ESTADO, { usuario: {}, solicitudId: 1 })).rejects.toThrow(/requiere el usuario/);
    await expect(auditar(OPERACIONES.CAMBIO_ESTADO, { usuario: { id: null }, solicitudId: 1 })).rejects.toThrow(
      /requiere el usuario/
    );
    expect(auditoriaRepository.registrar).not.toHaveBeenCalled();
  });

  it('una operación desconocida no se acepta', async () => {
    await expect(auditar('borrar_todo', { usuario: ADMIN })).rejects.toThrow(/desconocida/);
  });
});

describe('sin secretos: solo los campos de la lista blanca', () => {
  it('descarta password_hash, tokens y todo lo que la operación no declara', async () => {
    await auditar(OPERACIONES.CAMBIO_MONTO, {
      usuario: DUENO,
      solicitudId: 42,
      detalle: { campo: 'monto_solicitado', antes: 1, despues: 2, password_hash: '$2b$10$x', token: 'eyJ...', otro: 1 },
    });

    expect(registros()[0].detalle).toEqual({ campo: 'monto_solicitado', antes: 1, despues: 2 });
  });

  it.each([
    ['1234567890101', '*********0101'],
    ['1234 56789 0101', '*********0101'],
    ['123', '***'],
    [null, null],
  ])('enmascara el CUI %s → %s', (cui, esperado) => {
    expect(enmascararCui(cui)).toBe(esperado);
  });
});

describe('solo el administrador consulta la auditoría', () => {
  it.each([
    ['un estudiante', DUENO],
    ['un evaluador', EVALUADOR],
    ['la autoridad autorizadora', AUTORIZADOR],
    ['alguien sin rol', {}],
  ])('%s recibe 403', async (_quien, usuario) => {
    await expect(consultar(usuario)).rejects.toMatchObject({ status: 403 });
    expect(auditoriaRepository.listar).not.toHaveBeenCalled();
  });

  it('el administrador consulta todo, con el límite por defecto', async () => {
    auditoriaRepository.listar.mockResolvedValue([{ id: 1 }]);

    await expect(consultar(ADMIN)).resolves.toEqual([{ id: 1 }]);
    expect(auditoriaRepository.listar).toHaveBeenCalledWith({ solicitudId: null, limite: 200 });
  });

  it('filtra por solicitud y respeta el límite pedido', async () => {
    await consultar(ADMIN, { solicitudId: '42', limite: '10' });

    expect(auditoriaRepository.listar).toHaveBeenCalledWith({ solicitudId: 42, limite: 10 });
  });

  it.each([
    [{ solicitudId: 'abc' }],
    [{ solicitudId: '-1' }],
    [{ limite: '0' }],
    [{ limite: '501' }],
    [{ limite: '2.5' }],
  ])('rechaza filtros inválidos: %o', async (filtros) => {
    await expect(consultar(ADMIN, filtros)).rejects.toMatchObject({ status: 400 });
  });

  it('el controller toma el usuario del token y responde 403', async () => {
    const res = respuesta();
    await consultarController({ query: {}, usuario: { sub: 3, rol: 'estudiante' } }, res);

    expect(res.statusCode).toBe(403);
  });

  it('el controller no expone el mensaje de un error inesperado', async () => {
    auditoriaRepository.listar.mockRejectedValue(new Error('relation "auditoria" does not exist'));
    const res = respuesta();
    await consultarController({ query: {}, usuario: { sub: 1, rol: 'administrador' } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.cuerpo.error).toBe('Error interno del servidor.');
  });
});
