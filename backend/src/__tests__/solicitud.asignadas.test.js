// GET /api/solicitudes/asignadas — la bandeja de revisión.
//
// La pantalla del evaluador listaba con GET /api/solicitudes, que devuelve las
// solicitudes de las que uno es DUEÑO: a un evaluador le salía vacía siempre.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as solicitudRepository from '../repositories/solicitud.repository.js';
import * as solicitudService from '../services/solicitud.service.js';
import * as solicitudController from '../controllers/solicitud.controller.js';
import router from '../routes/solicitud.routes.js';

vi.mock('../repositories/solicitud.repository.js', () => ({
  listarAsignadasA: vi.fn(),
  listarEnRevision: vi.fn(),
}));

const EVALUADOR = { id: 77, rol: 'evaluador' };
const ADMINISTRADOR = { id: 1, rol: 'administrador' };
const ESTUDIANTE = { id: 3, rol: 'estudiante' };

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
  solicitudRepository.listarAsignadasA.mockResolvedValue([]);
  solicitudRepository.listarEnRevision.mockResolvedValue([]);
});

describe('listarAsignadas — qué ve cada rol', () => {
  it('evaluador: solo lo que tiene asignado, con la forma del detalle', async () => {
    solicitudRepository.listarAsignadasA.mockResolvedValue([
      fila({ id: 10, estado: 'Enviada' }),
      fila({ id: 11, estado: 'En Evaluación', tipo: 'nivel-medio' }),
    ]);

    const bandeja = await solicitudService.listarAsignadas(EVALUADOR);

    expect(solicitudRepository.listarAsignadasA).toHaveBeenCalledWith(77);
    expect(solicitudRepository.listarEnRevision).not.toHaveBeenCalled();
    expect(bandeja).toEqual([
      expect.objectContaining({ id: 10, estado: 'Enviada', accionesPermitidas: ['evaluar'], convocatoriaId: 1 }),
      expect.objectContaining({
        id: 11,
        estado: 'En Evaluación',
        accionesPermitidas: ['dictaminar'],
        documentosRequeridos: ['dni', 'carta'],
      }),
    ]);
  });

  it('evaluador sin asignaciones: arreglo vacío, no error', async () => {
    await expect(solicitudService.listarAsignadas(EVALUADOR)).resolves.toEqual([]);
  });

  it('administrador: todo lo que espera revisión', async () => {
    solicitudRepository.listarEnRevision.mockResolvedValue([fila({ id: 5 })]);

    const bandeja = await solicitudService.listarAsignadas(ADMINISTRADOR);

    expect(solicitudRepository.listarEnRevision).toHaveBeenCalled();
    expect(solicitudRepository.listarAsignadasA).not.toHaveBeenCalled();
    expect(bandeja).toEqual([expect.objectContaining({ id: 5, estado: 'Enviada' })]);
  });

  it.each([
    ['un estudiante', ESTUDIANTE],
    ['sin usuario', undefined],
    ['un usuario sin id', { rol: 'evaluador' }],
    ['un rol desconocido', { id: 4, rol: 'invitado' }],
  ])('%s: 403 sin consultar nada', async (_caso, usuario) => {
    await expect(solicitudService.listarAsignadas(usuario)).rejects.toMatchObject({ status: 403 });
    expect(solicitudRepository.listarAsignadasA).not.toHaveBeenCalled();
    expect(solicitudRepository.listarEnRevision).not.toHaveBeenCalled();
  });
});

describe('controller y ruta', () => {
  it('traduce el sub del token y responde la bandeja', async () => {
    solicitudRepository.listarAsignadasA.mockResolvedValue([fila()]);
    const res = resFalso();

    await solicitudController.listarAsignadas({ usuario: { sub: 77, rol: 'evaluador' } }, res);

    expect(solicitudRepository.listarAsignadasA).toHaveBeenCalledWith(77);
    expect(res.statusCode).toBe(200);
    expect(res.cuerpo[0]).toMatchObject({ id: 42, accionesPermitidas: ['evaluar'] });
  });

  it('un estudiante recibe 403 por HTTP', async () => {
    const res = resFalso();

    await solicitudController.listarAsignadas({ usuario: { sub: 3, rol: 'estudiante' } }, res);

    expect(res.statusCode).toBe(403);
  });

  it("'/asignadas' está registrada antes de '/:id'", () => {
    // Si fuera después, Express mandaría GET /asignadas a obtenerPorId con
    // id = "asignadas".
    const rutasGet = router.stack
      .filter((capa) => capa.route?.methods?.get)
      .map((capa) => capa.route.path);

    expect(rutasGet).toContain('/asignadas');
    expect(rutasGet.indexOf('/asignadas')).toBeLessThan(rutasGet.indexOf('/:id'));
  });
});

describe('las consultas de la bandeja', () => {
  // Esta suite no levanta PostgreSQL: se lee el SQL. La verificación contra la
  // base real está en scripts/demo-api.sh.
  async function consulta(nombre) {
    const fs = await import('node:fs/promises');
    const url = await import('node:url');
    const fuente = await fs.readFile(
      url.fileURLToPath(new URL('../repositories/solicitud.repository.js', import.meta.url)),
      'utf8'
    );
    const desde = fuente.indexOf(`export async function ${nombre}`);
    return fuente.slice(desde, fuente.indexOf('\n}', desde));
  }

  it('la del evaluador filtra por solicitud_evaluadores, de la más vieja a la más nueva', async () => {
    const sql = await consulta('listarAsignadasA');

    expect(sql).toMatch(/JOIN solicitud_evaluadores/);
    expect(sql).toMatch(/evaluador_id = \$1/);
    expect(sql).toMatch(/ORDER BY creado_en ASC/);
  });

  it('la del administrador trae solo Enviada y En Evaluación, de la más vieja a la más nueva', async () => {
    const sql = await consulta('listarEnRevision');

    expect(sql).toMatch(/estado IN \('Enviada', 'En Evaluación'\)/);
    expect(sql).toMatch(/ORDER BY creado_en ASC/);
  });
});
