// Quién puede hacer qué con una solicitud (corrección de SCRUM-35).
//
// Estas pruebas existen por un fallo concreto: cuando SCRUM-35 expuso el ciclo
// de vida por HTTP, ninguna de las transiciones comprobaba rol ni propiedad.
// Con dos estudiantes y tres peticiones, el segundo aprobaba la beca del
// primero. Cada caso de abajo es una forma de ese mismo fallo.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as solicitudRepository from '../repositories/solicitud.repository.js';
import * as documentoRepository from '../repositories/documento.repository.js';
import * as solicitudService from '../services/solicitud.service.js';

vi.mock('../repositories/solicitud.repository.js', () => ({
  findById: vi.fn(),
  crear: vi.fn(),
  actualizarEstado: vi.fn(),
}));

vi.mock('../repositories/documento.repository.js', () => ({
  evaluadoresDeSolicitud: vi.fn(),
  // Desde SCRUM-39 enviar exige el expediente completo: se consulta qué
  // documentos tiene la solicitud.
  listarDeSolicitud: vi.fn(),
}));

// Desde SCRUM-38 enviar valida el CUI contra RENAP (simulado, en memoria) y
// compara su nombre con el del dueño de la solicitud.
vi.mock('../repositories/usuario.repository.js', () => ({
  findById: vi.fn(async (id) => ({ id, nombre: 'Ana López' })),
}));

// Toda transición registra el aviso al estudiante (requerimiento de
// notificaciones). Se mockea como cualquier otro repositorio: esta suite no
// ejecuta SQL.
vi.mock('../repositories/notificacion.repository.js', () => ({
  registrar: vi.fn(async (aviso) => ({ id: 1, ...aviso })),
  marcarResultado: vi.fn(async () => {}),
}));

// Desde la doble aprobación, el estado y la aprobación se guardan en una
// transacción, y la decisión de cada etapa se registra. Esta suite no ejecuta
// SQL: la transacción solo corre el trabajo y el repositorio se mockea.
vi.mock('../config/transaccion.js', () => ({
  conTransaccion: async (trabajo) => trabajo(),
  db: () => ({}),
}));
vi.mock('../repositories/aprobacion.repository.js', () => ({
  ETAPAS: { EVALUACION: 'evaluacion', AUTORIZACION: 'autorizacion' },
  registrar: vi.fn(async (decision) => decision),
  listarDeSolicitud: vi.fn(async () => []),
}));

// R3: cada operación se audita. Esta suite no ejecuta SQL.
vi.mock('../repositories/auditoria.repository.js', () => ({
  registrar: vi.fn(async () => ({ id: 1 })),
  listar: vi.fn(async () => []),
}));

/** CUI que el simulador de RENAP conoce: ANA MARIA LOPEZ GARCIA. */
const CUI_ANA = '1234567890101';

const DUENO = { id: 3, rol: 'estudiante' };
const OTRO_ESTUDIANTE = { id: 9, rol: 'estudiante' };
const EVALUADOR_ASIGNADO = { id: 77, rol: 'evaluador' };
const EVALUADOR_AJENO = { id: 88, rol: 'evaluador' };
const ADMINISTRADOR = { id: 1, rol: 'administrador' };

/** Fila tal como la devolvería la tabla `solicitudes`, siempre del usuario 3. */
function fila(estado) {
  return { id: 42, estudiante_id: 3, estado, tipo: 'universitaria', monto_solicitado: '5000.00' };
}

describe('autorización de solicitudes — enviar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    solicitudRepository.actualizarEstado.mockResolvedValue({});
    documentoRepository.evaluadoresDeSolicitud.mockResolvedValue([EVALUADOR_ASIGNADO.id]);
    documentoRepository.listarDeSolicitud.mockResolvedValue([{ tipo: 'dni' }, { tipo: 'titulo' }, { tipo: 'carta' }]);
    solicitudRepository.findById.mockResolvedValue(fila('Borrador'));
  });

  it('el dueño envía su solicitud', async () => {
    await expect(
      solicitudService.enviarSolicitud(42, { usuario: DUENO, cui: CUI_ANA })
    ).resolves.toMatchObject({ estado: 'Enviada' });
  });

  it('403 a otro estudiante, y no persiste nada', async () => {
    await expect(
      solicitudService.enviarSolicitud(42, { usuario: OTRO_ESTUDIANTE })
    ).rejects.toMatchObject({ status: 403 });

    expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();
  });

  it('403 a un evaluador: enviar es del estudiante', async () => {
    await expect(
      solicitudService.enviarSolicitud(42, { usuario: EVALUADOR_ASIGNADO })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('403 sin usuario: falla cerrado', async () => {
    await expect(solicitudService.enviarSolicitud(42)).rejects.toMatchObject({ status: 403 });
    await expect(
      solicitudService.enviarSolicitud(42, { usuario: {} })
    ).rejects.toMatchObject({ status: 403 });
    expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();
  });
});

describe('autorización de solicitudes — evaluar y dictaminar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    solicitudRepository.actualizarEstado.mockResolvedValue({});
    documentoRepository.evaluadoresDeSolicitud.mockResolvedValue([EVALUADOR_ASIGNADO.id]);
    documentoRepository.listarDeSolicitud.mockResolvedValue([{ tipo: 'dni' }, { tipo: 'titulo' }, { tipo: 'carta' }]);
  });

  it('el evaluador asignado evalúa', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Enviada'));

    await expect(
      solicitudService.evaluarSolicitud(42, { usuario: EVALUADOR_ASIGNADO })
    ).resolves.toMatchObject({ estado: 'En Evaluación' });
  });

  it('403 a un evaluador que no está asignado a esa solicitud', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Enviada'));

    await expect(
      solicitudService.evaluarSolicitud(42, { usuario: EVALUADOR_AJENO })
    ).rejects.toMatchObject({ status: 403 });

    expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();
  });

  it('el dueño NO puede aprobarse su propia beca', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('En Evaluación'));

    await expect(
      solicitudService.dictaminarSolicitud(42, true, { usuario: DUENO })
    ).rejects.toMatchObject({ status: 403 });

    expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();
  });

  it('un estudiante ajeno NO puede rechazar la beca de otro', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('En Evaluación'));

    await expect(
      solicitudService.dictaminarSolicitud(42, false, { usuario: OTRO_ESTUDIANTE })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('el evaluador asignado dictamina', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('En Evaluación'));

    await expect(
      solicitudService.dictaminarSolicitud(42, true, { usuario: EVALUADOR_ASIGNADO })
    ).resolves.toMatchObject({ estado: 'Aprobada' });
  });

  it('el recorrido completo que antes servía para el ataque ahora se corta', async () => {
    // Las tres peticiones con las que un estudiante llevaba la solicitud de
    // otro de Borrador a Aprobada.
    solicitudRepository.findById.mockResolvedValue(fila('Borrador'));
    await expect(
      solicitudService.enviarSolicitud(42, { usuario: OTRO_ESTUDIANTE })
    ).rejects.toMatchObject({ status: 403 });

    solicitudRepository.findById.mockResolvedValue(fila('Enviada'));
    await expect(
      solicitudService.evaluarSolicitud(42, { usuario: OTRO_ESTUDIANTE })
    ).rejects.toMatchObject({ status: 403 });

    solicitudRepository.findById.mockResolvedValue(fila('En Evaluación'));
    await expect(
      solicitudService.dictaminarSolicitud(42, true, { usuario: OTRO_ESTUDIANTE })
    ).rejects.toMatchObject({ status: 403 });

    expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();
  });
});

describe('autorización de solicitudes — lectura', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documentoRepository.evaluadoresDeSolicitud.mockResolvedValue([EVALUADOR_ASIGNADO.id]);
    documentoRepository.listarDeSolicitud.mockResolvedValue([{ tipo: 'dni' }, { tipo: 'titulo' }, { tipo: 'carta' }]);
    solicitudRepository.findById.mockResolvedValue(fila('Enviada'));
  });

  it('el dueño ve su solicitud', async () => {
    await expect(solicitudService.obtenerSolicitud(42, DUENO)).resolves.toMatchObject({ id: 42 });
  });

  it('un evaluador asignado también', async () => {
    await expect(
      solicitudService.obtenerSolicitud(42, EVALUADOR_ASIGNADO)
    ).resolves.toMatchObject({ id: 42 });
  });

  it('403 a un estudiante ajeno', async () => {
    await expect(solicitudService.obtenerSolicitud(42, OTRO_ESTUDIANTE)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('403 a un evaluador no asignado', async () => {
    await expect(solicitudService.obtenerSolicitud(42, EVALUADOR_AJENO)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('403 sin usuario', async () => {
    await expect(solicitudService.obtenerSolicitud(42)).rejects.toMatchObject({ status: 403 });
  });
});

describe('autorización de solicitudes — administrador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    solicitudRepository.actualizarEstado.mockResolvedValue({});
    documentoRepository.evaluadoresDeSolicitud.mockResolvedValue([]);
  });

  it('puede ver, enviar y dictaminar cualquier solicitud', async () => {
    solicitudRepository.findById.mockResolvedValue(fila('Enviada'));
    await expect(
      solicitudService.obtenerSolicitud(42, ADMINISTRADOR)
    ).resolves.toMatchObject({ id: 42 });

    solicitudRepository.findById.mockResolvedValue(fila('Borrador'));
    await expect(
      solicitudService.enviarSolicitud(42, { usuario: ADMINISTRADOR, cui: CUI_ANA })
    ).resolves.toMatchObject({ estado: 'Enviada' });

    solicitudRepository.findById.mockResolvedValue(fila('En Evaluación'));
    await expect(
      solicitudService.dictaminarSolicitud(42, true, { usuario: ADMINISTRADOR })
    ).resolves.toMatchObject({ estado: 'Aprobada' });
  });
});

describe('el orden importa: 404 antes que 403', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documentoRepository.evaluadoresDeSolicitud.mockResolvedValue([]);
  });

  it('una solicitud que no existe da 404, no 403', async () => {
    // Si diera 403, un atacante podría distinguir una solicitud ajena de una
    // inexistente. Acá no hay nada que ocultar: el id es secuencial y público.
    solicitudRepository.findById.mockResolvedValue(null);

    await expect(
      solicitudService.enviarSolicitud(404, { usuario: OTRO_ESTUDIANTE })
    ).rejects.toMatchObject({ status: 404 });
  });
});
