// POST /api/solicitudes/:id/evaluadores — el administrador asigna evaluadores.
//
// Hasta ahora la asignación solo se podía sembrar por SQL: sin ella, la bandeja
// del evaluador (GET /api/solicitudes/asignadas) siempre salía vacía.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as solicitudRepository from '../repositories/solicitud.repository.js';
import * as usuarioRepository from '../repositories/usuario.repository.js';
import * as solicitudService from '../services/solicitud.service.js';
import * as solicitudController from '../controllers/solicitud.controller.js';
import router from '../routes/solicitud.routes.js';
import { crearEstadoDesdeNombre } from '../patterns/state/index.js';

vi.mock('../repositories/solicitud.repository.js', () => ({
  findById: vi.fn(),
  asignarEvaluador: vi.fn(),
}));

vi.mock('../repositories/usuario.repository.js', () => ({
  findById: vi.fn(),
}));

// La operación y su auditoría van en una transacción; aquí solo corre el trabajo.
vi.mock('../config/transaccion.js', () => ({
  conTransaccion: async (trabajo) => trabajo(),
  db: () => ({}),
}));

// R3: cada operación se audita. Esta suite no ejecuta SQL.
vi.mock('../repositories/auditoria.repository.js', () => ({
  registrar: vi.fn(async () => ({ id: 1 })),
  listar: vi.fn(async () => []),
}));

const ADMINISTRADOR = { id: 1, rol: 'administrador' };
const EVALUADOR = { id: 77, rol: 'evaluador' };
const ESTUDIANTE = { id: 3, rol: 'estudiante' };

const USUARIO_EVALUADOR = { id: 77, nombre: 'Eva Luadora', email: 'eva@mineduc.gob.gt', rol: 'evaluador' };

function fila(extra = {}) {
  return { id: 42, estudiante_id: 3, estado: 'Enviada', tipo: 'universitaria', convocatoria_id: 1, ...extra };
}

function resFalso() {
  return {
    statusCode: 200,
    cuerpo: undefined,
    status(c) { this.statusCode = c; return this; },
    json(c) { this.cuerpo = c; return this; },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  solicitudRepository.findById.mockResolvedValue(fila());
  solicitudRepository.asignarEvaluador.mockResolvedValue(true);
  usuarioRepository.findById.mockResolvedValue(USUARIO_EVALUADOR);
});

describe('asignarEvaluador — el caso feliz', () => {
  it('asigna y devuelve la solicitud y el evaluador, sin datos de más', async () => {
    const resultado = await solicitudService.asignarEvaluador(42, 77, ADMINISTRADOR);

    expect(solicitudRepository.asignarEvaluador).toHaveBeenCalledWith(42, 77);
    expect(resultado).toEqual({
      solicitudId: 42,
      evaluador: { id: 77, nombre: 'Eva Luadora', email: 'eva@mineduc.gob.gt' },
    });
  });

  it('acepta el id como cadena, como llega de un formulario', async () => {
    await solicitudService.asignarEvaluador(42, '77', ADMINISTRADOR);

    expect(usuarioRepository.findById).toHaveBeenCalledWith(77);
    expect(solicitudRepository.asignarEvaluador).toHaveBeenCalledWith(42, 77);
  });
});

describe('asignarEvaluador — 403: solo administrador', () => {
  it.each([
    ['un estudiante', ESTUDIANTE],
    ['un evaluador', EVALUADOR],
    ['sin usuario', undefined],
    ['un usuario sin id', { rol: 'administrador' }],
  ])('%s: 403 sin consultar nada', async (_caso, usuario) => {
    await expect(solicitudService.asignarEvaluador(42, 77, usuario)).rejects.toMatchObject({ status: 403 });
    expect(solicitudRepository.findById).not.toHaveBeenCalled();
    expect(solicitudRepository.asignarEvaluador).not.toHaveBeenCalled();
  });

  it('a quien no es administrador no le revela si la solicitud existe', async () => {
    // Si se cargara la solicitud antes, un estudiante distinguiría por 404/403
    // qué ids existen.
    solicitudRepository.findById.mockResolvedValue(null);

    await expect(solicitudService.asignarEvaluador(999, 77, ESTUDIANTE)).rejects.toMatchObject({ status: 403 });
  });
});

describe('asignarEvaluador — 404: la solicitud no existe', () => {
  it('responde 404 y no escribe', async () => {
    solicitudRepository.findById.mockResolvedValue(null);

    await expect(solicitudService.asignarEvaluador(999, 77, ADMINISTRADOR)).rejects.toMatchObject({
      status: 404,
      message: expect.stringContaining('999'),
    });
    expect(solicitudRepository.asignarEvaluador).not.toHaveBeenCalled();
  });
});

describe('asignarEvaluador — 400: el body no es un evaluador', () => {
  it.each([
    ['sin evaluadorId', undefined],
    ['null', null],
    ['texto', 'abc'],
    ['decimal', 7.5],
    ['cero', 0],
    ['negativo', -3],
  ])('evaluadorId %s: 400 sin consultar nada', async (_caso, evaluadorId) => {
    await expect(solicitudService.asignarEvaluador(42, evaluadorId, ADMINISTRADOR)).rejects.toMatchObject({
      status: 400,
    });
    expect(solicitudRepository.findById).not.toHaveBeenCalled();
    expect(solicitudRepository.asignarEvaluador).not.toHaveBeenCalled();
  });

  it.each(['estudiante', 'administrador'])('un usuario con rol %s: 400', async (rol) => {
    usuarioRepository.findById.mockResolvedValue({ ...USUARIO_EVALUADOR, rol });

    await expect(solicitudService.asignarEvaluador(42, 77, ADMINISTRADOR)).rejects.toMatchObject({
      status: 400,
      message: 'El usuario 77 no es evaluador.',
    });
    expect(solicitudRepository.asignarEvaluador).not.toHaveBeenCalled();
  });

  it('un usuario que no existe: el mismo 400', async () => {
    usuarioRepository.findById.mockResolvedValue(null);

    await expect(solicitudService.asignarEvaluador(42, 77, ADMINISTRADOR)).rejects.toMatchObject({
      status: 400,
      message: 'El usuario 77 no es evaluador.',
    });
  });
});

describe('asignarEvaluador — 409: solo Enviada o En Evaluación', () => {
  // Un evaluador asignado puede descargar el expediente: en Borrador lo vería
  // antes del envío, y en un estado final ganaría acceso sin nada que evaluar.
  it.each(['Enviada', 'En Evaluación'])('%s: asigna', async (estado) => {
    solicitudRepository.findById.mockResolvedValue(fila({ estado }));

    await expect(solicitudService.asignarEvaluador(42, 77, ADMINISTRADOR)).resolves.toMatchObject({
      solicitudId: 42,
    });
    expect(solicitudRepository.asignarEvaluador).toHaveBeenCalledWith(42, 77);
  });

  it.each(['Borrador', 'Aprobada', 'Rechazada'])('%s: 409 y no escribe', async (estado) => {
    solicitudRepository.findById.mockResolvedValue(fila({ estado }));

    await expect(solicitudService.asignarEvaluador(42, 77, ADMINISTRADOR)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining(estado),
    });
    expect(solicitudRepository.asignarEvaluador).not.toHaveBeenCalled();
  });

  it('la regla vive en los estados, prohibida por omisión', () => {
    expect(
      ['Borrador', 'Enviada', 'En Evaluación', 'Aprobada', 'Rechazada'].filter(
        (nombre) => crearEstadoDesdeNombre(nombre).admiteEvaluadores
      )
    ).toEqual(['Enviada', 'En Evaluación']);
  });
});

describe('asignarEvaluador — 409: ya está asignado', () => {
  it('cuando el INSERT no inserta nada', async () => {
    solicitudRepository.asignarEvaluador.mockResolvedValue(false);

    await expect(solicitudService.asignarEvaluador(42, 77, ADMINISTRADOR)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('ya está asignado'),
    });
  });
});

describe('controller y ruta', () => {
  it('traduce el sub del token, lee el body y responde 201', async () => {
    const res = resFalso();

    await solicitudController.asignarEvaluador(
      { params: { id: '42' }, body: { evaluadorId: 77 }, usuario: { sub: 1, rol: 'administrador' } },
      res
    );

    expect(solicitudRepository.asignarEvaluador).toHaveBeenCalledWith(42, 77);
    expect(res.statusCode).toBe(201);
    expect(res.cuerpo).toMatchObject({ solicitudId: 42, evaluador: { id: 77 } });
  });

  it.each([
    ['un estudiante', { sub: 3, rol: 'estudiante' }, { evaluadorId: 77 }, 403],
    ['sin body', { sub: 1, rol: 'administrador' }, undefined, 400],
  ])('%s recibe %s por HTTP', async (_caso, usuario, body, esperado) => {
    const res = resFalso();

    await solicitudController.asignarEvaluador({ params: { id: '42' }, body, usuario }, res);

    expect(res.statusCode).toBe(esperado);
    expect(res.cuerpo).toHaveProperty('error');
  });

  it('un error inesperado de la base no sale al cliente', async () => {
    solicitudRepository.asignarEvaluador.mockRejectedValue(new Error('violates foreign key constraint "x"'));
    const res = resFalso();

    await solicitudController.asignarEvaluador(
      { params: { id: '42' }, body: { evaluadorId: 77 }, usuario: { sub: 1, rol: 'administrador' } },
      res
    );

    expect(res.statusCode).toBe(500);
    expect(res.cuerpo.error).not.toMatch(/constraint/);
  });

  it('POST /:id/evaluadores está registrada y exige sesión', () => {
    const capa = router.stack.find((c) => c.route?.path === '/:id/evaluadores' && c.route.methods.post);

    expect(capa).toBeDefined();
    expect(capa.route.stack.map((s) => s.name)).toContain('autenticado');
  });
});

describe('la consulta de asignación', () => {
  // Esta suite no levanta PostgreSQL: se lee el SQL. La verificación contra la
  // base real está en scripts/demo-api.sh.
  it('inserta en solicitud_evaluadores y deja que la llave primaria decida el 409', async () => {
    const fs = await import('node:fs/promises');
    const url = await import('node:url');
    const fuente = await fs.readFile(
      url.fileURLToPath(new URL('../repositories/solicitud.repository.js', import.meta.url)),
      'utf8'
    );
    const desde = fuente.indexOf('export async function asignarEvaluador');
    const sql = fuente.slice(desde, fuente.indexOf('\n}', desde));

    expect(sql).toMatch(/INSERT INTO solicitud_evaluadores/);
    expect(sql).toMatch(/ON CONFLICT DO NOTHING/);
  });
});
