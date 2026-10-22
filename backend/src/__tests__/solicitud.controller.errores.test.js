// Qué sale al cliente cuando algo falla (corrección de SCRUM-35).
//
// El controller distingue dos clases de error: los de negocio, que llevan
// `status` a propósito y cuyo mensaje está escrito para el usuario, y los
// inesperados, que no lo llevan. Los segundos no deben hablar: un error de
// PostgreSQL trae nombres de tabla y de restricción.
//
// Esta prueba existe porque la protección se perdió una vez en una
// reescritura de responderError y ninguna prueba lo notó.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as solicitudController from '../controllers/solicitud.controller.js';
import * as solicitudService from '../services/solicitud.service.js';

vi.mock('../services/solicitud.service.js', () => ({
  tiposDeBeca: vi.fn(),
  documentosRequeridos: vi.fn(),
  crearSolicitud: vi.fn(),
  obtenerSolicitud: vi.fn(),
  enviarSolicitud: vi.fn(),
  evaluarSolicitud: vi.fn(),
  dictaminarSolicitud: vi.fn(),
}));

/** Doble de res que registra lo que el controller respondió. */
function resFalso() {
  return {
    statusCode: 200,
    cuerpo: undefined,
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
  };
}

/** El mensaje que PostgreSQL devolvió de verdad en este caso. */
const MENSAJE_DE_POSTGRES =
  'insert or update on table "solicitudes" violates foreign key constraint "solicitudes_estudiante_id_fkey"';

const PETICION = { params: { id: '42' }, body: { aprobado: true }, usuario: { sub: 1, rol: 'evaluador' } };

describe('responderError — un error inesperado no habla', () => {
  beforeEach(() => vi.clearAllMocks());

  it('un error sin status da 500 con un mensaje genérico', async () => {
    solicitudService.enviarSolicitud.mockRejectedValue(new Error(MENSAJE_DE_POSTGRES));
    const res = resFalso();

    await solicitudController.enviar(PETICION, res);

    expect(res.statusCode).toBe(500);
    expect(res.cuerpo.error).toBe('Error interno del servidor.');
  });

  it('no filtra nombres de tabla ni de restricción', async () => {
    solicitudService.dictaminarSolicitud.mockRejectedValue(new Error(MENSAJE_DE_POSTGRES));
    const res = resFalso();

    await solicitudController.dictaminar(PETICION, res);

    const cuerpo = JSON.stringify(res.cuerpo);
    expect(cuerpo).not.toContain('solicitudes_estudiante_id_fkey');
    expect(cuerpo).not.toContain('foreign key');
    expect(cuerpo).not.toContain('violates');
  });

  it('en cada acción del ciclo de vida, no solo en una', async () => {
    const casos = [
      ['obtenerPorId', 'obtenerSolicitud'],
      ['enviar', 'enviarSolicitud'],
      ['evaluar', 'evaluarSolicitud'],
      ['dictaminar', 'dictaminarSolicitud'],
    ];

    for (const [handler, metodo] of casos) {
      vi.clearAllMocks();
      solicitudService[metodo].mockRejectedValue(new Error(MENSAJE_DE_POSTGRES));
      const res = resFalso();

      await solicitudController[handler](PETICION, res);

      expect(res.statusCode, handler).toBe(500);
      expect(JSON.stringify(res.cuerpo), handler).not.toContain('fkey');
    }
  });
});

describe('responderError — un error de negocio sí habla', () => {
  beforeEach(() => vi.clearAllMocks());

  it('un 403 llega con su mensaje, que está escrito para el usuario', async () => {
    const denegado = new Error('No puede enviar una solicitud ajena.');
    denegado.status = 403;
    solicitudService.enviarSolicitud.mockRejectedValue(denegado);
    const res = resFalso();

    await solicitudController.enviar(PETICION, res);

    expect(res.statusCode).toBe(403);
    expect(res.cuerpo.error).toBe('No puede enviar una solicitud ajena.');
  });

  it('un 409 de transición inválida también', async () => {
    const invalida = new Error('No se puede evaluar una solicitud en "Borrador".');
    invalida.status = 409;
    solicitudService.evaluarSolicitud.mockRejectedValue(invalida);
    const res = resFalso();

    await solicitudController.evaluar(PETICION, res);

    expect(res.statusCode).toBe(409);
    expect(res.cuerpo.error).toContain('Borrador');
  });

  it('un 404 conserva su mensaje', async () => {
    const noExiste = new Error('No existe la solicitud 42.');
    noExiste.status = 404;
    solicitudService.obtenerSolicitud.mockRejectedValue(noExiste);
    const res = resFalso();

    await solicitudController.obtenerPorId(PETICION, res);

    expect(res.statusCode).toBe(404);
    expect(res.cuerpo.error).toBe('No existe la solicitud 42.');
  });
});

describe('el id del token se traduce al del dominio', () => {
  beforeEach(() => vi.clearAllMocks());

  it('enviar pasa el sub del token como id del usuario', async () => {
    solicitudService.enviarSolicitud.mockResolvedValue({ id: 42, estado: 'Enviada' });
    const res = resFalso();

    await solicitudController.enviar(
      { params: { id: '42' }, usuario: { sub: 7, rol: 'estudiante' } },
      res
    );

    // Si pasara `id` en vez de `sub`, el dueño no se reconocería como tal y
    // recibiría 403 sobre su propia solicitud.
    expect(solicitudService.enviarSolicitud).toHaveBeenCalledWith(42, {
      usuario: { id: 7, rol: 'estudiante' },
    });
  });

  it('dictaminar también', async () => {
    solicitudService.dictaminarSolicitud.mockResolvedValue({ id: 42, estado: 'Aprobada' });
    const res = resFalso();

    await solicitudController.dictaminar(
      { params: { id: '42' }, body: { aprobado: true }, usuario: { sub: 77, rol: 'evaluador' } },
      res
    );

    expect(solicitudService.dictaminarSolicitud).toHaveBeenCalledWith(42, true, {
      usuario: { id: 77, rol: 'evaluador' },
    });
  });
});
