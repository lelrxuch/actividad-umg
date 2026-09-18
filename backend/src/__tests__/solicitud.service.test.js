import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as solicitudRepository from '../repositories/solicitud.repository.js';
import * as solicitudService from '../services/solicitud.service.js';
import { TransicionInvalidaError } from '../patterns/state/index.js';

// Se mockea solo la capa de datos: el service y los patrones se ejecutan de verdad.
vi.mock('../repositories/solicitud.repository.js', () => ({
  findById: vi.fn(),
  crear: vi.fn(),
  actualizarEstado: vi.fn(),
}));

/** Fila tal como la devolvería la tabla `solicitudes`. */
function filaEnEstado(estado, id = 42) {
  return { id, estudiante_id: 3, estado, creado_en: new Date(), actualizado_en: new Date() };
}

describe('solicitud.service — integración de los patrones State y Observer', () => {
  let transporteCorreo;

  beforeEach(() => {
    vi.clearAllMocks();
    transporteCorreo = vi.fn();
    solicitudRepository.actualizarEstado.mockResolvedValue({});
  });

  describe('crearSolicitud', () => {
    it('persiste la solicitud nueva en estado Borrador', async () => {
      solicitudRepository.crear.mockResolvedValue({ id: 99, estudiante_id: 3, estado: 'Borrador' });

      const creada = await solicitudService.crearSolicitud(3);

      expect(solicitudRepository.crear).toHaveBeenCalledWith(3, 'Borrador');
      expect(creada).toMatchObject({ id: 99, estado: 'Borrador', accionesPermitidas: ['enviar'] });
    });
  });

  describe('transiciones válidas', () => {
    it('enviarSolicitud persiste el estado Enviada', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('Borrador'));

      const resultado = await solicitudService.enviarSolicitud(42);

      expect(solicitudRepository.actualizarEstado).toHaveBeenCalledWith(42, 'Enviada');
      expect(resultado.estado).toBe('Enviada');
    });

    it('evaluarSolicitud persiste el estado En Evaluación', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('Enviada'));

      await solicitudService.evaluarSolicitud(42);

      expect(solicitudRepository.actualizarEstado).toHaveBeenCalledWith(42, 'En Evaluación');
    });

    it('dictaminarSolicitud(true) persiste Aprobada', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('En Evaluación'));

      await solicitudService.dictaminarSolicitud(42, true);

      expect(solicitudRepository.actualizarEstado).toHaveBeenCalledWith(42, 'Aprobada');
    });

    it('dictaminarSolicitud(false) persiste Rechazada', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('En Evaluación'));

      await solicitudService.dictaminarSolicitud(42, false);

      expect(solicitudRepository.actualizarEstado).toHaveBeenCalledWith(42, 'Rechazada');
    });
  });

  describe('transiciones inválidas', () => {
    it('propaga TransicionInvalidaError al intentar dictaminar un Borrador', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('Borrador'));

      await expect(solicitudService.dictaminarSolicitud(42, true)).rejects.toThrow(
        TransicionInvalidaError
      );
    });

    it('NO escribe en base de datos cuando la transición es inválida', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('Aprobada'));

      await expect(solicitudService.enviarSolicitud(42)).rejects.toThrow(TransicionInvalidaError);

      expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();
    });

    it('devuelve 404 cuando la solicitud no existe', async () => {
      solicitudRepository.findById.mockResolvedValue(null);

      await expect(solicitudService.enviarSolicitud(404)).rejects.toMatchObject({ status: 404 });
      expect(solicitudRepository.actualizarEstado).not.toHaveBeenCalled();
    });
  });

  describe('notificación al estudiante', () => {
    it('avisa al estudiante cuando la transición se completa', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('Enviada'));

      await solicitudService.evaluarSolicitud(42, {
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

      const solicitud = await solicitudService.obtenerSolicitud(42);

      expect(solicitud).toMatchObject({
        estado: 'En Evaluación',
        accionesPermitidas: ['dictaminar'],
      });
    });

    it('un estado final no admite ninguna acción', async () => {
      solicitudRepository.findById.mockResolvedValue(filaEnEstado('Aprobada'));

      const solicitud = await solicitudService.obtenerSolicitud(42);

      expect(solicitud.accionesPermitidas).toEqual([]);
    });
  });
});
