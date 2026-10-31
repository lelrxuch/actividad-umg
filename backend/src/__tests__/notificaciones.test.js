// Requerimiento nuevo del Product Owner (30/10/2026): notificaciones por cambio
// de estado. Cada bloque corresponde a un criterio de aceptación.
//
// Se mockean solo los repositorios: el service, el patrón State, el patrón
// Observer y el listener corren de verdad.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as solicitudRepository from '../repositories/solicitud.repository.js';
import * as notificacionRepository from '../repositories/notificacion.repository.js';
import * as documentoRepository from '../repositories/documento.repository.js';
import * as solicitudService from '../services/solicitud.service.js';
import * as notificacionService from '../services/notificacion.service.js';
import { listarMias, marcarLeida } from '../controllers/notificacion.controller.js';
import { Solicitud, EstadoEnviada, TransicionInvalidaError } from '../patterns/state/index.js';
import { INotificacionObserver } from '../patterns/observer/INotificacionObserver.js';
import { NotificacionRegistradaListener } from '../patterns/observer/NotificacionRegistradaListener.js';

vi.mock('../repositories/solicitud.repository.js', () => ({
  findById: vi.fn(),
  actualizarEstado: vi.fn(),
}));

vi.mock('../repositories/documento.repository.js', () => ({
  evaluadoresDeSolicitud: vi.fn(),
  listarDeSolicitud: vi.fn(),
}));

vi.mock('../repositories/usuario.repository.js', () => ({
  findById: vi.fn(async (id) => ({ id, nombre: 'Ana López' })),
}));

vi.mock('../repositories/notificacion.repository.js', () => ({
  registrar: vi.fn(),
  marcarResultado: vi.fn(),
  listarDe: vi.fn(),
  contarNoLeidas: vi.fn(),
  marcarLeida: vi.fn(),
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

/** El estudiante dueño de la solicitud de prueba. */
const DUENO_ID = 3;
/** El evaluador asignado: es quien provoca el cambio, no quien recibe el aviso. */
const EVALUADOR = { id: 77, rol: 'evaluador' };

function filaEnEstado(estado) {
  return { id: 42, estudiante_id: DUENO_ID, estado, tipo: 'universitaria' };
}

/** Respuesta falsa de Express que guarda lo que se le respondió. */
function respuesta() {
  const res = { statusCode: 200, cuerpo: undefined };
  res.status = vi.fn((codigo) => {
    res.statusCode = codigo;
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
  notificacionRepository.registrar.mockImplementation(async (aviso) => ({ id: 900, ...aviso }));
  notificacionRepository.marcarResultado.mockResolvedValue();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('se genera una notificación para el estudiante dueño cuando la solicitud cambia de estado', () => {
  it('la transición registra el aviso, dirigido al dueño y no a quien la provocó', async () => {
    solicitudRepository.findById.mockResolvedValue(filaEnEstado('Enviada'));

    await solicitudService.evaluarSolicitud(42, { usuario: EVALUADOR });

    expect(notificacionRepository.registrar).toHaveBeenCalledTimes(1);
    expect(notificacionRepository.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ destinatarioId: DUENO_ID, canal: 'app' })
    );
  });

  it('el aviso identifica la solicitud e informa su nuevo estado', async () => {
    solicitudRepository.findById.mockResolvedValue(filaEnEstado('Enviada'));

    await solicitudService.evaluarSolicitud(42, { usuario: EVALUADOR });

    const aviso = notificacionRepository.registrar.mock.calls[0][0];
    expect(aviso).toMatchObject({ solicitudId: 42, estadoNuevo: 'En Evaluación' });
    expect(aviso.mensaje).toContain('En Evaluación');
  });

  it('una transición rechazada por el estado no genera aviso', async () => {
    solicitudRepository.findById.mockResolvedValue(filaEnEstado('Borrador'));

    await expect(solicitudService.evaluarSolicitud(42, { usuario: EVALUADOR })).rejects.toThrow(
      TransicionInvalidaError
    );

    expect(notificacionRepository.registrar).not.toHaveBeenCalled();
  });

  it('una transición rechazada por permisos no genera aviso', async () => {
    solicitudRepository.findById.mockResolvedValue(filaEnEstado('Enviada'));

    await expect(
      solicitudService.evaluarSolicitud(42, { usuario: { id: 5, rol: 'estudiante' } })
    ).rejects.toMatchObject({ status: 403 });

    expect(notificacionRepository.registrar).not.toHaveBeenCalled();
  });
});

describe('se registra el evento que origina la notificación', () => {
  it('guarda el cambio de estado completo: el anterior y el nuevo', async () => {
    solicitudRepository.findById.mockResolvedValue(filaEnEstado('Enviada'));

    await solicitudService.evaluarSolicitud(42, { usuario: EVALUADOR });

    expect(notificacionRepository.registrar.mock.calls[0][0]).toMatchObject({
      estadoAnterior: 'Enviada',
      estadoNuevo: 'En Evaluación',
    });
  });

  it('el evento se registra ANTES de intentar la entrega, para que una falla no lo pierda', async () => {
    const entregar = vi.fn(async () => {
      throw new Error('servidor de correo caído');
    });
    const listener = new NotificacionRegistradaListener({
      destinatarioId: DUENO_ID,
      canal: 'correo',
      repositorio: notificacionRepository,
      entregar,
    });

    await expect(listener.actualizar('aviso', { solicitudId: 42 })).rejects.toThrow('servidor de correo caído');

    expect(notificacionRepository.registrar).toHaveBeenCalledTimes(1);
    expect(notificacionRepository.registrar.mock.invocationCallOrder[0]).toBeLessThan(
      entregar.mock.invocationCallOrder[0]
    );
  });
});

describe('si falla la notificación, el cambio de estado se conserva', () => {
  it('se guarda el estado ANTES de avisar', async () => {
    solicitudRepository.findById.mockResolvedValue(filaEnEstado('Enviada'));

    await solicitudService.evaluarSolicitud(42, { usuario: EVALUADOR });

    expect(solicitudRepository.actualizarEstado.mock.invocationCallOrder[0]).toBeLessThan(
      notificacionRepository.registrar.mock.invocationCallOrder[0]
    );
  });

  it('si guardar el estado falla, no se avisa de un estado que no existe', async () => {
    solicitudRepository.findById.mockResolvedValue(filaEnEstado('Enviada'));
    solicitudRepository.actualizarEstado.mockRejectedValue(new Error('base de datos caída'));

    await expect(solicitudService.evaluarSolicitud(42, { usuario: EVALUADOR })).rejects.toThrow(
      'base de datos caída'
    );

    expect(notificacionRepository.registrar).not.toHaveBeenCalled();
  });

  it('si el servicio de notificaciones falla, la transición responde bien y el estado quedó guardado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    solicitudRepository.findById.mockResolvedValue(filaEnEstado('Enviada'));
    notificacionRepository.registrar.mockRejectedValue(new Error('tabla de avisos no disponible'));

    const resultado = await solicitudService.evaluarSolicitud(42, { usuario: EVALUADOR });

    expect(resultado.estado).toBe('En Evaluación');
    expect(solicitudRepository.actualizarEstado).toHaveBeenCalledWith(42, 'En Evaluación');
  });
});

describe('los errores del servicio de notificaciones no comprometen el proceso de solicitudes', () => {
  /** Un canal de prueba que siempre falla. */
  class CanalQueFalla extends INotificacionObserver {
    constructor(forma) {
      super();
      this.forma = forma;
    }

    actualizar() {
      if (this.forma === 'sincrona') throw new Error('falla síncrona');
      return Promise.reject(new Error('falla asíncrona'));
    }
  }

  it.each(['sincrona', 'asincrona'])('una falla %s de un canal no interrumpe a los demás', async (forma) => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const otroCanal = { recibio: false };
    class CanalQueFunciona extends INotificacionObserver {
      actualizar() {
        otroCanal.recibio = true;
      }
    }

    const solicitud = new Solicitud({ id: 42, estado: new EstadoEnviada() });
    solicitud.agregarObserver(new CanalQueFalla(forma));
    solicitud.agregarObserver(new CanalQueFunciona());

    await expect(solicitud.notificar('aviso', {})).resolves.toBeUndefined();

    expect(otroCanal.recibio).toBe(true);
    expect(consola).toHaveBeenCalledWith(expect.stringContaining('CanalQueFalla falló'));
  });

  it('una falla de entrega queda anotada en el aviso, con su error', async () => {
    const listener = new NotificacionRegistradaListener({
      destinatarioId: DUENO_ID,
      canal: 'correo',
      repositorio: notificacionRepository,
      entregar: async () => {
        throw new Error('servidor de correo caído');
      },
    });

    await expect(listener.actualizar('aviso', { solicitudId: 42 })).rejects.toThrow();

    expect(notificacionRepository.marcarResultado).toHaveBeenCalledWith(900, {
      enviada: false,
      error: 'servidor de correo caído',
    });
  });

  it('una entrega exitosa queda anotada como enviada', async () => {
    const listener = new NotificacionRegistradaListener({
      destinatarioId: DUENO_ID,
      canal: 'correo',
      repositorio: notificacionRepository,
      entregar: async () => {},
    });

    await listener.actualizar('aviso', { solicitudId: 42 });

    expect(notificacionRepository.marcarResultado).toHaveBeenCalledWith(900, { enviada: true });
  });

  it('en la aplicación el aviso guardado es la entrega: queda enviado sin un segundo paso', async () => {
    const listener = new NotificacionRegistradaListener({
      destinatarioId: DUENO_ID,
      canal: 'app',
      repositorio: notificacionRepository,
    });

    await listener.actualizar('aviso', { solicitudId: 42 });

    expect(notificacionRepository.registrar).toHaveBeenCalledWith(expect.objectContaining({ enviada: true }));
    expect(notificacionRepository.marcarResultado).not.toHaveBeenCalled();
  });
});

describe('se pueden agregar canales sin modificar la lógica del sistema', () => {
  it('un canal nuevo es un observer más; la solicitud no sabe qué hace cada uno', async () => {
    const recibidos = [];
    class CanalSms extends INotificacionObserver {
      actualizar(mensaje, contexto) {
        recibidos.push({ mensaje, contexto });
      }
    }

    const solicitud = new Solicitud({ id: 42, estado: new EstadoEnviada() });
    solicitud.agregarObserver(new CanalSms());
    solicitud.evaluar();

    expect(recibidos).toEqual([
      {
        mensaje: 'Su solicitud de beca cambió de "Enviada" a "En Evaluación".',
        contexto: { solicitudId: 42, estadoAnterior: 'Enviada', estadoNuevo: 'En Evaluación' },
      },
    ]);
  });

  it('con notificación diferida, el aviso espera a que se publique', async () => {
    const recibidos = [];
    class Canal extends INotificacionObserver {
      actualizar(mensaje) {
        recibidos.push(mensaje);
      }
    }

    const solicitud = new Solicitud({ id: 42, estado: new EstadoEnviada(), notificacionDiferida: true });
    solicitud.agregarObserver(new Canal());
    solicitud.evaluar();

    expect(recibidos).toHaveLength(0);
    await solicitud.publicarNotificaciones();
    expect(recibidos).toHaveLength(1);

    await solicitud.publicarNotificaciones();
    expect(recibidos).toHaveLength(1);
  });

  it('el listener exige destinatario, canal y repositorio', () => {
    expect(() => new NotificacionRegistradaListener({ canal: 'app', repositorio: {} })).toThrow(TypeError);
    expect(() => new NotificacionRegistradaListener({ destinatarioId: 1, repositorio: {} })).toThrow(TypeError);
    expect(() => new NotificacionRegistradaListener({ destinatarioId: 1, canal: 'app' })).toThrow(TypeError);
  });
});

describe('consulta de notificaciones: cada usuario ve solo las suyas', () => {
  it('lista las del usuario del token y cuenta las no leídas', async () => {
    notificacionRepository.listarDe.mockResolvedValue([
      { id: 2, leidaEn: null },
      { id: 1, leidaEn: new Date() },
    ]);
    notificacionRepository.contarNoLeidas.mockResolvedValue(1);

    const res = respuesta();
    await listarMias({ usuario: { sub: DUENO_ID, rol: 'estudiante' } }, res);

    expect(notificacionRepository.listarDe).toHaveBeenCalledWith(DUENO_ID);
    expect(notificacionRepository.contarNoLeidas).toHaveBeenCalledWith(DUENO_ID);
    expect(res.cuerpo).toMatchObject({ noLeidas: 1 });
  });

  it('el contador cuenta todas las no leídas, no solo las 50 que trae la lista', async () => {
    notificacionRepository.listarDe.mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => ({ id: i + 1, leidaEn: null }))
    );
    notificacionRepository.contarNoLeidas.mockResolvedValue(73);

    const res = respuesta();
    await listarMias({ usuario: { sub: DUENO_ID, rol: 'estudiante' } }, res);

    expect(res.cuerpo.noLeidas).toBe(73);
    expect(res.cuerpo.notificaciones).toHaveLength(50);
  });

  it('sin usuario identificado responde 403 y no consulta nada', async () => {
    const res = respuesta();
    await listarMias({ usuario: {} }, res);

    expect(res.statusCode).toBe(403);
    expect(notificacionRepository.listarDe).not.toHaveBeenCalled();
  });

  it('marca como leída una propia, buscándola con el dueño del token', async () => {
    notificacionRepository.marcarLeida.mockResolvedValue({ id: 7, leidaEn: new Date() });

    const res = respuesta();
    await marcarLeida({ params: { id: '7' }, usuario: { sub: DUENO_ID } }, res);

    expect(notificacionRepository.marcarLeida).toHaveBeenCalledWith(7, DUENO_ID);
    expect(res.statusCode).toBe(200);
  });

  it('una ajena o inexistente responde 404, sin revelar cuál de las dos es', async () => {
    notificacionRepository.marcarLeida.mockResolvedValue(null);

    const res = respuesta();
    await marcarLeida({ params: { id: '7' }, usuario: { sub: 99 } }, res);

    expect(res.statusCode).toBe(404);
  });

  it('un id inválido responde 400 sin consultar', async () => {
    await expect(notificacionService.marcarLeida('abc', { id: DUENO_ID })).rejects.toMatchObject({ status: 400 });
    expect(notificacionRepository.marcarLeida).not.toHaveBeenCalled();
  });

  it('un error inesperado no filtra su mensaje', async () => {
    notificacionRepository.listarDe.mockRejectedValue(new Error('relation "notificaciones" does not exist'));

    const res = respuesta();
    await listarMias({ usuario: { sub: DUENO_ID } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.cuerpo).toEqual({ error: 'Error interno del servidor.' });
  });
});
