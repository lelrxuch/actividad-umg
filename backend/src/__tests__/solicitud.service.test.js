import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as solicitudRepository from '../repositories/solicitud.repository.js';
import * as solicitudService from '../services/solicitud.service.js';
import * as documentoRepository from '../repositories/documento.repository.js';
import { TransicionInvalidaError } from '../patterns/state/index.js';

// Se mockea solo la capa de datos: el service y los patrones se ejecutan de verdad.
vi.mock('../repositories/solicitud.repository.js', () => ({
  findById: vi.fn(),
  crear: vi.fn(),
  actualizarEstado: vi.fn(),
}));

// La autorización pregunta quién está asignado como evaluador. Desde la
// corrección de SCRUM-35 cada transición exige un actor con derecho a pedirla,
// así que las pruebas pasan uno explícito.
vi.mock('../repositories/documento.repository.js', () => ({
  evaluadoresDeSolicitud: vi.fn(),
  // Desde SCRUM-39 enviar exige el expediente completo: se consulta qué
  // documentos tiene la solicitud.
  listarDeSolicitud: vi.fn(),
}));

// Desde SCRUM-38 enviar compara el nombre del dueño con el de RENAP. RENAP no
// se mockea: el cliente simulado responde en memoria.
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

/** CUI que el simulador de RENAP conoce: ANA MARIA LOPEZ GARCIA. */
const CUI_ANA = '1234567890101';

/** El estudiante dueño de las filas de prueba. */
const DUENO = { id: 3, rol: 'estudiante' };
/** Un evaluador asignado a la solicitud de prueba. */
const EVALUADOR = { id: 77, rol: 'evaluador' };

/** Fila tal como la devolvería la tabla `solicitudes`. */
function filaEnEstado(estado, id = 42) {
  return { id, estudiante_id: 3, estado, tipo: 'universitaria', creado_en: new Date(), actualizado_en: new Date() };
}

describe('solicitud.service — integración de los patrones State y Observer', () => {
  let transporteCorreo;

  beforeEach(() => {
    vi.clearAllMocks();
    transporteCorreo = vi.fn();
    solicitudRepository.actualizarEstado.mockResolvedValue({});
    documentoRepository.evaluadoresDeSolicitud.mockResolvedValue([EVALUADOR.id]);
    documentoRepository.listarDeSolicitud.mockResolvedValue([{ tipo: 'dni' }, { tipo: 'titulo' }, { tipo: 'carta' }]);
  });

  describe('crearSolicitud', () => {
    it('persiste la solicitud nueva en estado Borrador', async () => {
      solicitudRepository.crear.mockResolvedValue({ id: 99, estudiante_id: 3, estado: 'Borrador' });

      // SCRUM-30: la modalidad de beca ahora es obligatoria y la resuelve
      // SolicitudFactory; el estado inicial lo sigue fijando el patrón State.
      const creada = await solicitudService.crearSolicitud(3, 'universitaria');

      // Desde SCRUM-32 la modalidad SI se persiste: la columna existia desde la
      // migracion de SCRUM-59 y quedaba en NULL, lo que dejaba sin efecto la
      // validacion de tipo de documento de SCRUM-42.
      expect(solicitudRepository.crear).toHaveBeenCalledWith(3, 'Borrador', {
        tipo: 'universitaria',
        convocatoriaId: null,
      });
      expect(creada).toMatchObject({ id: 99, estado: 'Borrador', accionesPermitidas: ['enviar'] });
    });
  });

  describe('transiciones válidas', () => {
    it('enviarSolicitud persiste el estado Enviada', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('Borrador'));

      const resultado = await solicitudService.enviarSolicitud(42, { usuario: DUENO, cui: CUI_ANA });

      expect(solicitudRepository.actualizarEstado).toHaveBeenCalledWith(42, 'Enviada', { cui: CUI_ANA });
      expect(resultado.estado).toBe('Enviada');
    });

    it('evaluarSolicitud persiste el estado En Evaluación', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('Enviada'));

      await solicitudService.evaluarSolicitud(42, { usuario: EVALUADOR });

      expect(solicitudRepository.actualizarEstado).toHaveBeenCalledWith(42, 'En Evaluación');
    });

    it('dictaminarSolicitud(true) persiste Aprobada', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('En Evaluación'));

      await solicitudService.dictaminarSolicitud(42, true, { usuario: EVALUADOR });

      expect(solicitudRepository.actualizarEstado).toHaveBeenCalledWith(42, 'Aprobada');
    });

    it('dictaminarSolicitud(false) persiste Rechazada', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('En Evaluación'));

      await solicitudService.dictaminarSolicitud(42, false, { usuario: EVALUADOR });

      expect(solicitudRepository.actualizarEstado).toHaveBeenCalledWith(42, 'Rechazada');
    });
  });

  describe('transiciones inválidas', () => {
    it('propaga TransicionInvalidaError al intentar dictaminar un Borrador', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('Borrador'));

      await expect(solicitudService.dictaminarSolicitud(42, true, { usuario: EVALUADOR })).rejects.toThrow(
        TransicionInvalidaError
      );
    });

    it('NO escribe en base de datos cuando la transición es inválida', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('Aprobada'));

      await expect(solicitudService.enviarSolicitud(42, { usuario: DUENO })).rejects.toThrow(TransicionInvalidaError);

      expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();
    });

    it('devuelve 404 cuando la solicitud no existe', async () => {
      solicitudRepository.findById.mockResolvedValue(null);

      await expect(solicitudService.enviarSolicitud(404, { usuario: DUENO })).rejects.toMatchObject({ status: 404 });
      expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();
    });
  });

  describe('notificación al estudiante', () => {
    it('avisa al estudiante cuando la transición se completa', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('Enviada'));

      await solicitudService.evaluarSolicitud(42, {
        usuario: EVALUADOR,
        correoEstudiante: 'ana@miumg.edu.gt',
        transporteCorreo,
      });

      expect(transporteCorreo).toHaveBeenCalledTimes(1);
      expect(transporteCorreo).toHaveBeenCalledWith({
        para: 'ana@miumg.edu.gt',
        asunto: 'Actualización de su solicitud de beca #42',
        cuerpo: 'Su solicitud de beca cambió de "Enviada" a "En Evaluación".',
      });
    });

    it('no avisa a nadie si la transición fue rechazada', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('Borrador'));

      await expect(
        solicitudService.evaluarSolicitud(42, {
          usuario: EVALUADOR,
          correoEstudiante: 'ana@miumg.edu.gt',
          transporteCorreo,
        })
      ).rejects.toThrow(TransicionInvalidaError);

      expect(transporteCorreo).not.toHaveBeenCalled();
    });
  });

  describe('obtenerSolicitud', () => {
    it('informa qué acciones admite la solicitud en su estado actual', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('En Evaluación'));

      const solicitud = await solicitudService.obtenerSolicitud(42, DUENO);

      expect(solicitud).toMatchObject({
        estado: 'En Evaluación',
        accionesPermitidas: ['dictaminar'],
      });
    });

    it('un estado final no admite ninguna acción', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('Aprobada'));

      const solicitud = await solicitudService.obtenerSolicitud(42, DUENO);

      expect(solicitud.accionesPermitidas).toEqual([]);
    });
  });
});
