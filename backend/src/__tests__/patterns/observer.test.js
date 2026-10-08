import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Solicitud, crearEstadoDesdeNombre } from '../../patterns/state/index.js';
import { INotificacionObserver } from '../../patterns/observer/INotificacionObserver.js';
import { EmailNotificationListener } from '../../patterns/observer/EmailNotificationListener.js';

/** Observer de prueba que solo acumula lo que recibe. */
class ObserverEspia extends INotificacionObserver {
  constructor() {
    super();
    this.recibidos = [];
  }

  actualizar(mensaje, contexto) {
    this.recibidos.push({ mensaje, contexto });
  }
}

describe('Patrón Observer — notificación de cambios de estado', () => {
  let solicitud;
  let transporte;
  let listener;

  beforeEach(() => {
    solicitud = new Solicitud({ id: 42, estudiante: 'ana@miumg.edu.gt' });
    transporte = vi.fn();
    listener = new EmailNotificationListener('ana@miumg.edu.gt', { transporte });
  });

  describe('registro de suscriptores', () => {
    it('agregarObserver deja el observer registrado', () => {
      solicitud.agregarObserver(listener);

      expect(solicitud.observers).toContain(listener);
    });

    it('no registra dos veces el mismo observer', () => {
      solicitud.agregarObserver(listener).agregarObserver(listener);
      solicitud.enviar();

      expect(transporte).toHaveBeenCalledTimes(1);
    });

    it('rechaza objetos que no implementen INotificacionObserver', () => {
      expect(() => solicitud.agregarObserver({ actualizar: () => {} })).toThrow(TypeError);
    });

    it('quitarObserver lo da de baja y deja de recibir avisos', () => {
      solicitud.agregarObserver(listener);

      expect(solicitud.quitarObserver(listener)).toBe(true);
      solicitud.enviar();

      expect(transporte).not.toHaveBeenCalled();
    });

    it('quitarObserver devuelve false si no estaba registrado', () => {
      expect(solicitud.quitarObserver(listener)).toBe(false);
    });
  });

  describe('los observers reciben la notificación al cambiar de estado', () => {
    it('notifica al pasar de Borrador a Enviada', () => {
      solicitud.agregarObserver(listener);

      solicitud.enviar();

      expect(transporte).toHaveBeenCalledTimes(1);
      expect(listener.enviados[0]).toEqual({
        para: 'ana@miumg.edu.gt',
        asunto: 'Actualización de su solicitud de beca #42',
        cuerpo: 'Su solicitud de beca cambió de "Borrador" a "Enviada".',
      });
    });

    it('notifica una vez por cada transición del ciclo completo', () => {
      solicitud.agregarObserver(listener);

      solicitud.enviar().evaluar().dictaminar(true);

      expect(transporte).toHaveBeenCalledTimes(3);
      expect(listener.enviados.map((c) => c.cuerpo)).toEqual([
        'Su solicitud de beca cambió de "Borrador" a "Enviada".',
        'Su solicitud de beca cambió de "Enviada" a "En Evaluación".',
        'Su solicitud de beca cambió de "En Evaluación" a "Aprobada".',
      ]);
    });

    it('entrega el contexto del evento además del mensaje', () => {
      const espia = new ObserverEspia();
      solicitud.agregarObserver(espia);

      solicitud.enviar();

      expect(espia.recibidos[0].contexto).toEqual({
        solicitudId: 42,
        estadoAnterior: 'Borrador',
        estadoNuevo: 'Enviada',
      });
    });

    it('notifica a todos los suscriptores registrados', () => {
      const espiaA = new ObserverEspia();
      const espiaB = new ObserverEspia();
      solicitud.agregarObserver(listener).agregarObserver(espiaA).agregarObserver(espiaB);

      solicitud.enviar();

      expect(transporte).toHaveBeenCalledTimes(1);
      expect(espiaA.recibidos).toHaveLength(1);
      expect(espiaB.recibidos).toHaveLength(1);
    });

    it('NO notifica cuando la transición es inválida', () => {
      solicitud.agregarObserver(listener);

      expect(() => solicitud.evaluar()).toThrow();

      expect(transporte).not.toHaveBeenCalled();
      expect(listener.enviados).toHaveLength(0);
    });

    it('una solicitud sin suscriptores cambia de estado sin fallar', () => {
      expect(() => solicitud.enviar()).not.toThrow();
      expect(solicitud.nombreEstado).toBe('Enviada');
    });
  });

  describe('aislamiento de fallos', () => {
    it('un observer que falla no impide la transición ni afecta a los demás', () => {
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
      const roto = new ObserverEspia();
      roto.actualizar = () => {
        throw new Error('servidor SMTP caído');
      };
      const sano = new ObserverEspia();
      solicitud.agregarObserver(roto).agregarObserver(sano);

      expect(() => solicitud.enviar()).not.toThrow();

      expect(solicitud.nombreEstado).toBe('Enviada');
      expect(sano.recibidos).toHaveLength(1);
      expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('servidor SMTP caído'));

      errorLog.mockRestore();
    });
  });

  describe('EmailNotificationListener', () => {
    it('exige un destinatario', () => {
      expect(() => new EmailNotificationListener()).toThrow(TypeError);
      expect(() => new EmailNotificationListener('')).toThrow(TypeError);
    });

    it('usa el log de consola cuando no se le inyecta transporte', () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const porDefecto = new EmailNotificationListener('ana@miumg.edu.gt');

      porDefecto.actualizar('mensaje de prueba', { solicitudId: 1 });

      expect(log).toHaveBeenCalledWith(expect.stringContaining('ana@miumg.edu.gt'));
      log.mockRestore();
    });

    it('omite el número de solicitud en el asunto si no viene en el contexto', () => {
      listener.actualizar('mensaje suelto');

      expect(listener.enviados[0].asunto).toBe('Actualización de su solicitud de beca');
    });

    it('la interfaz base obliga a implementar actualizar()', () => {
      class ObserverIncompleto extends INotificacionObserver {}

      expect(() => new ObserverIncompleto().actualizar('x')).toThrow(/debe implementar/);
    });
  });

  describe('integración State + Observer', () => {
    it('una solicitud rehidratada notifica desde el estado en que quedó', () => {
      const enCurso = new Solicitud({ id: 8, estado: crearEstadoDesdeNombre('En Evaluación') });
      const espia = new ObserverEspia();
      enCurso.agregarObserver(espia);

      enCurso.dictaminar(false);

      expect(espia.recibidos[0].mensaje).toBe(
        'Su solicitud de beca cambió de "En Evaluación" a "Rechazada".'
      );
    });
  });
});
