// Reglas del flujo del estudiante que el backend NO aplicaba.
//
// Se encontraron al probar la API contra PostgreSQL real para construir las
// pantallas, no por una prueba: las tres Historias figuraban como terminadas.
//   1. SCRUM-39: se podía ENVIAR una solicitud sin un solo documento (200).
//   2. SCRUM-36: un estudiante podía abrir DOS solicitudes en la misma
//      convocatoria (201).
//   3. El listado y el detalle no traían la modalidad ni los documentos
//      requeridos, así que la pantalla no podía saber qué pedir.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as solicitudRepository from '../repositories/solicitud.repository.js';
import * as documentoRepository from '../repositories/documento.repository.js';
import * as convocatoriaService from '../services/convocatoria.service.js';
import * as solicitudService from '../services/solicitud.service.js';
import * as solicitudController from '../controllers/solicitud.controller.js';
import * as usuarioRepository from '../repositories/usuario.repository.js';
import { RenapAdapter } from '../patterns/structural/RenapAdapter.js';
import { RenapClienteSimulado } from '../patterns/structural/RenapClienteSimulado.js';

vi.mock('../repositories/solicitud.repository.js', () => ({
  findById: vi.fn(),
  crear: vi.fn(),
  actualizarEstado: vi.fn(),
  listarPorEstudiante: vi.fn(),
  vigenteEnConvocatoria: vi.fn(),
}));

vi.mock('../repositories/documento.repository.js', () => ({
  evaluadoresDeSolicitud: vi.fn(),
  listarDeSolicitud: vi.fn(),
}));

vi.mock('../services/convocatoria.service.js', () => ({
  exigirConvocatoriaAbierta: vi.fn(),
}));

// RENAP no se mockea: el cliente simulado responde en memoria. Lo que se
// mockea es de dónde sale el nombre del dueño.
vi.mock('../repositories/usuario.repository.js', () => ({
  findById: vi.fn(),
}));

const DUENO = { id: 3, rol: 'estudiante' };
const OTRO = { id: 9, rol: 'estudiante' };
/** CUI que el simulador de RENAP conoce: ANA MARIA LOPEZ GARCIA. */
const CUI_ANA = '1234567890101';
const EXPEDIENTE_COMPLETO = [{ tipo: 'dni' }, { tipo: 'titulo' }, { tipo: 'carta' }];

function fila(extra = {}) {
  return { id: 42, estudiante_id: 3, estado: 'Borrador', tipo: 'universitaria', convocatoria_id: 1, ...extra };
}

beforeEach(() => {
  vi.clearAllMocks();
  solicitudRepository.actualizarEstado.mockResolvedValue({});
  documentoRepository.evaluadoresDeSolicitud.mockResolvedValue([]);
  convocatoriaService.exigirConvocatoriaAbierta.mockResolvedValue();
  usuarioRepository.findById.mockResolvedValue({ id: 3, nombre: 'Ana López' });
});

describe('SCRUM-39 — no se envía un expediente incompleto', () => {
  it('sin ningún documento: 400 con la lista completa de faltantes', async () => {
    solicitudRepository.findById.mockResolvedValue(fila());
    documentoRepository.listarDeSolicitud.mockResolvedValue([]);

    await expect(solicitudService.enviarSolicitud(42, { usuario: DUENO })).rejects.toMatchObject({
      status: 400,
      faltantes: ['dni', 'titulo', 'carta'],
    });
  });

  it('con documentos parciales: dice exactamente cuáles faltan', async () => {
    solicitudRepository.findById.mockResolvedValue(fila());
    documentoRepository.listarDeSolicitud.mockResolvedValue([{ tipo: 'dni' }]);

    await expect(solicitudService.enviarSolicitud(42, { usuario: DUENO })).rejects.toMatchObject({
      status: 400,
      faltantes: ['titulo', 'carta'],
    });
  });

  it('cada modalidad exige lo suyo: nivel medio no pide título', async () => {
    solicitudRepository.findById.mockResolvedValue(fila({ tipo: 'nivel-medio' }));
    documentoRepository.listarDeSolicitud.mockResolvedValue([{ tipo: 'dni' }, { tipo: 'carta' }]);

    await expect(solicitudService.enviarSolicitud(42, { usuario: DUENO, cui: CUI_ANA })).resolves.toMatchObject({
      estado: 'Enviada',
    });
  });

  it('un expediente incompleto NO cambia el estado en base de datos', async () => {
    solicitudRepository.findById.mockResolvedValue(fila());
    documentoRepository.listarDeSolicitud.mockResolvedValue([]);

    await expect(solicitudService.enviarSolicitud(42, { usuario: DUENO })).rejects.toThrow();
    expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();
  });

  it('con el expediente completo, se envía', async () => {
    solicitudRepository.findById.mockResolvedValue(fila());
    documentoRepository.listarDeSolicitud.mockResolvedValue(EXPEDIENTE_COMPLETO);

    await solicitudService.enviarSolicitud(42, { usuario: DUENO, cui: CUI_ANA });

    expect(solicitudRepository.actualizarEstado).toHaveBeenCalledWith(42, 'Enviada', { cui: CUI_ANA });
  });

  it('una solicitud sin modalidad no se puede enviar: no hay contra qué validar', async () => {
    solicitudRepository.findById.mockResolvedValue(fila({ tipo: null }));

    await expect(solicitudService.enviarSolicitud(42, { usuario: DUENO })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('reenviar una ya enviada da 409 por el estado, no 400 por los documentos', async () => {
    // El orden importa: si el estado no admite la acción, revisar documentos
    // daría un mensaje falso ("le faltan papeles") sobre algo que no aplica.
    solicitudRepository.findById.mockResolvedValue(fila({ estado: 'Enviada' }));
    documentoRepository.listarDeSolicitud.mockResolvedValue([]);

    await expect(solicitudService.enviarSolicitud(42, { usuario: DUENO })).rejects.toMatchObject({
      status: 409,
    });
    expect(documentoRepository.listarDeSolicitud).not.toHaveBeenCalled();
  });

  it('un tercero recibe 403 antes de enterarse de qué documentos faltan', async () => {
    // Quién va primero: revelarle a otro estudiante el estado del expediente
    // ajeno sería filtrar información.
    solicitudRepository.findById.mockResolvedValue(fila());
    documentoRepository.listarDeSolicitud.mockResolvedValue([]);

    await expect(solicitudService.enviarSolicitud(42, { usuario: OTRO })).rejects.toMatchObject({
      status: 403,
    });
    expect(documentoRepository.listarDeSolicitud).not.toHaveBeenCalled();
  });
});

describe('SCRUM-38 — se envía con un CUI que existe en RENAP y es del dueño', () => {
  beforeEach(() => {
    solicitudRepository.findById.mockResolvedValue(fila());
    documentoRepository.listarDeSolicitud.mockResolvedValue(EXPEDIENTE_COMPLETO);
  });

  /** Un RENAP que no contesta, y que avisa si alguien lo consultó. */
  function renapCaido() {
    const cliente = new RenapClienteSimulado({ fallaCon: new Error('ECONNREFUSED') });
    vi.spyOn(cliente, 'consultarCiudadano');
    return { cliente, validadorIdentidad: new RenapAdapter({ cliente }) };
  }

  it('registra el CUI ya normalizado, en el mismo UPDATE que el estado', async () => {
    await solicitudService.enviarSolicitud(42, { usuario: DUENO, cui: '1234 56789 0101' });

    expect(solicitudRepository.actualizarEstado).toHaveBeenCalledWith(42, 'Enviada', { cui: CUI_ANA });
  });

  it('el nombre del dueño se compara con el de RENAP sin exigir el nombre completo', async () => {
    // RENAP: "ANA MARIA LOPEZ GARCIA". Registrada como "Ana López".
    await expect(
      solicitudService.enviarSolicitud(42, { usuario: DUENO, cui: CUI_ANA })
    ).resolves.toMatchObject({ estado: 'Enviada' });
    expect(usuarioRepository.findById).toHaveBeenCalledWith(3);
  });

  it.each([
    ['sin CUI', undefined],
    ['con un CUI mal escrito', '12345'],
    ['con un CUI que RENAP no conoce', '9999999999999'],
  ])('%s: 400 y no cambia el estado', async (_caso, cui) => {
    await expect(solicitudService.enviarSolicitud(42, { usuario: DUENO, cui })).rejects.toMatchObject({
      status: 400,
    });
    expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();
  });

  it('con el CUI de otra persona: 400, sin revelar el nombre que tiene RENAP', async () => {
    // 2345678901202 es CARLOS PEREZ; la dueña es Ana López.
    const error = await solicitudService
      .enviarSolicitud(42, { usuario: DUENO, cui: '2345678901202' })
      .catch((e) => e);

    expect(error).toMatchObject({ status: 400 });
    expect(error.message).not.toMatch(/carlos|perez/i);
    expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();
  });

  it('si RENAP no responde: 503, no cambia el estado y se puede reintentar', async () => {
    const { validadorIdentidad } = renapCaido();

    await expect(
      solicitudService.enviarSolicitud(42, { usuario: DUENO, cui: CUI_ANA, validadorIdentidad })
    ).rejects.toMatchObject({ status: 503 });
    expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();

    // Sigue en Borrador: el reintento, con RENAP de vuelta, pasa.
    await expect(
      solicitudService.enviarSolicitud(42, { usuario: DUENO, cui: CUI_ANA })
    ).resolves.toMatchObject({ estado: 'Enviada' });
  });

  describe('RENAP va al final: no se consulta si otra regla ya rechazó', () => {
    it.each([
      ['un tercero (403)', { usuario: OTRO }, fila(), 403],
      ['una ya enviada (409)', { usuario: DUENO }, fila({ estado: 'Enviada' }), 409],
      ['un expediente incompleto (400)', { usuario: DUENO }, fila(), 400, [{ tipo: 'dni' }]],
    ])('%s', async (_caso, opciones, filaDeBase, status, documentos = EXPEDIENTE_COMPLETO) => {
      solicitudRepository.findById.mockResolvedValue(filaDeBase);
      documentoRepository.listarDeSolicitud.mockResolvedValue(documentos);
      const { cliente, validadorIdentidad } = renapCaido();

      await expect(
        solicitudService.enviarSolicitud(42, { ...opciones, cui: CUI_ANA, validadorIdentidad })
      ).rejects.toMatchObject({ status });
      expect(cliente.consultarCiudadano).not.toHaveBeenCalled();
    });
  });
});

describe('SCRUM-36 — una sola solicitud vigente por convocatoria', () => {
  it('si ya tiene una, 409 e indica cuál es', async () => {
    solicitudRepository.vigenteEnConvocatoria.mockResolvedValue(4);

    await expect(
      solicitudService.crearSolicitud(3, 'universitaria', { convocatoriaId: 1 })
    ).rejects.toMatchObject({ status: 409, solicitudExistente: 4 });

    expect(solicitudRepository.vigenteEnConvocatoria).toHaveBeenCalledWith(3, 1);
    expect(solicitudRepository.crear).not.toHaveBeenCalled();
  });

  it('si no tiene ninguna vigente, la crea', async () => {
    solicitudRepository.vigenteEnConvocatoria.mockResolvedValue(null);
    solicitudRepository.crear.mockResolvedValue(fila({ id: 50 }));

    const creada = await solicitudService.crearSolicitud(3, 'universitaria', { convocatoriaId: 1 });

    expect(creada).toMatchObject({ id: 50, estado: 'Borrador', convocatoriaId: 1 });
  });

  it('fuera de convocatoria no hay con qué duplicar: no se consulta', async () => {
    solicitudRepository.crear.mockResolvedValue(fila({ id: 51, convocatoria_id: null }));

    await solicitudService.crearSolicitud(3, 'universitaria');

    expect(solicitudRepository.vigenteEnConvocatoria).not.toHaveBeenCalled();
  });

  it('la convocatoria cerrada se rechaza antes de buscar duplicados', async () => {
    const cerrada = new Error('La convocatoria 1 está en "Cerrada" y no admite solicitudes.');
    cerrada.status = 409;
    convocatoriaService.exigirConvocatoriaAbierta.mockRejectedValue(cerrada);

    await expect(
      solicitudService.crearSolicitud(3, 'universitaria', { convocatoriaId: 1 })
    ).rejects.toThrow('Cerrada');
    expect(solicitudRepository.vigenteEnConvocatoria).not.toHaveBeenCalled();
  });

  it('la consulta de vigencia excluye solo las rechazadas', async () => {
    // Lo que define "vigente" vive en el SQL; se lee la consulta porque esta
    // suite no levanta PostgreSQL (ver ANEXO 7 §9).
    const fs = await import('node:fs/promises');
    const url = await import('node:url');
    const fuente = await fs.readFile(
      url.fileURLToPath(new URL('../repositories/solicitud.repository.js', import.meta.url)),
      'utf8'
    );
    const consulta = fuente.slice(fuente.indexOf('export async function vigenteEnConvocatoria'));

    expect(consulta).toMatch(/estado <> 'Rechazada'/);
    expect(consulta).toMatch(/convocatoria_id = \$2/);
  });
});

describe('una sola forma de la solicitud en todas las respuestas', () => {
  it('el detalle trae modalidad, documentos requeridos y convocatoria', async () => {
    solicitudRepository.findById.mockResolvedValue(fila());

    const detalle = await solicitudService.obtenerSolicitud(42, DUENO);

    expect(detalle).toMatchObject({
      id: 42,
      estado: 'Borrador',
      tipo: 'universitaria',
      documentosRequeridos: ['dni', 'titulo', 'carta'],
      convocatoriaId: 1,
      accionesPermitidas: ['enviar'],
    });
  });

  it('el listado trae lo mismo que el detalle, para cada solicitud', async () => {
    solicitudRepository.listarPorEstudiante.mockResolvedValue([
      fila({ id: 1, tipo: 'nivel-medio' }),
      fila({ id: 2, estado: 'Enviada' }),
    ]);

    const lista = await solicitudService.listarMisSolicitudes(DUENO);

    expect(solicitudRepository.listarPorEstudiante).toHaveBeenCalledWith(3);
    expect(lista[0]).toMatchObject({ id: 1, tipo: 'nivel-medio', documentosRequeridos: ['dni', 'carta'] });
    expect(lista[1]).toMatchObject({ id: 2, estado: 'Enviada', accionesPermitidas: ['evaluar'] });
  });

  it('el listado sin usuario identificable no consulta nada', async () => {
    await expect(solicitudService.listarMisSolicitudes(undefined)).rejects.toMatchObject({ status: 403 });
    expect(solicitudRepository.listarPorEstudiante).not.toHaveBeenCalled();
  });

  it('una transición devuelve también la forma completa', async () => {
    solicitudRepository.findById.mockResolvedValue(fila());
    documentoRepository.listarDeSolicitud.mockResolvedValue(EXPEDIENTE_COMPLETO);

    const enviada = await solicitudService.enviarSolicitud(42, { usuario: DUENO, cui: CUI_ANA });

    expect(enviada).toMatchObject({ estado: 'Enviada', tipo: 'universitaria', convocatoriaId: 1 });
  });
});

describe('controller — el contrato de error lleva lo que el cliente necesita', () => {
  function resFalso() {
    return {
      statusCode: 200,
      cuerpo: undefined,
      status(c) { this.statusCode = c; return this; },
      json(c) { this.cuerpo = c; return this; },
    };
  }

  it('enviar incompleto responde 400 con faltantes en el cuerpo', async () => {
    solicitudRepository.findById.mockResolvedValue(fila());
    documentoRepository.listarDeSolicitud.mockResolvedValue([{ tipo: 'dni' }]);
    const res = resFalso();

    await solicitudController.enviar({ params: { id: '42' }, usuario: { sub: 3, rol: 'estudiante' } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.cuerpo.faltantes).toEqual(['titulo', 'carta']);
  });

  it('enviar toma el CUI del cuerpo de la petición', async () => {
    solicitudRepository.findById.mockResolvedValue(fila());
    documentoRepository.listarDeSolicitud.mockResolvedValue(EXPEDIENTE_COMPLETO);
    const res = resFalso();

    await solicitudController.enviar(
      { params: { id: '42' }, body: { cui: CUI_ANA }, usuario: { sub: 3, rol: 'estudiante' } },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.cuerpo.estado).toBe('Enviada');
  });

  it('enviar con un CUI desconocido responde 400 con el motivo', async () => {
    solicitudRepository.findById.mockResolvedValue(fila());
    documentoRepository.listarDeSolicitud.mockResolvedValue(EXPEDIENTE_COMPLETO);
    const res = resFalso();

    await solicitudController.enviar(
      { params: { id: '42' }, body: { cui: '9999999999999' }, usuario: { sub: 3, rol: 'estudiante' } },
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.cuerpo.error).toMatch(/no encontrado/i);
  });

  it('crear duplicada responde 409 con la solicitud existente', async () => {
    solicitudRepository.vigenteEnConvocatoria.mockResolvedValue(4);
    const res = resFalso();

    await solicitudController.crear(
      { body: { tipo: 'universitaria', convocatoriaId: 1 }, usuario: { sub: 3, rol: 'estudiante' } },
      res
    );

    expect(res.statusCode).toBe(409);
    expect(res.cuerpo.solicitudExistente).toBe(4);
  });

  it('el listado pasa por el service, con el sub del token traducido a id', async () => {
    solicitudRepository.listarPorEstudiante.mockResolvedValue([fila()]);
    const res = resFalso();

    await solicitudController.listarMisSolicitudes({ usuario: { sub: 3, rol: 'estudiante' } }, res);

    expect(solicitudRepository.listarPorEstudiante).toHaveBeenCalledWith(3);
    expect(res.cuerpo[0]).toMatchObject({ tipo: 'universitaria', documentosRequeridos: ['dni', 'titulo', 'carta'] });
  });
});
