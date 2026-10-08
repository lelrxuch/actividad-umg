import { describe, it, expect, beforeEach } from 'vitest';
import {
  Solicitud,
  EstadoBorrador,
  EstadoEnviada,
  EstadoEnEvaluacion,
  EstadoAprobada,
  EstadoRechazada,
  IEstadoSolicitud,
  TransicionInvalidaError,
  crearEstadoDesdeNombre,
  nombresDeEstado,
} from '../../patterns/state/index.js';

describe('Patrón State — ciclo de vida de una Solicitud', () => {
  let solicitud;

  beforeEach(() => {
    solicitud = new Solicitud({ id: 7, estudiante: 'ana@miumg.edu.gt' });
  });

  describe('estado inicial', () => {
    it('una solicitud nueva arranca en Borrador', () => {
      expect(solicitud.nombreEstado).toBe('Borrador');
      expect(solicitud.estado).toBeInstanceOf(EstadoBorrador);
    });

    it('expone las acciones que admite el estado actual', () => {
      expect(solicitud.accionesPermitidas).toEqual(['enviar']);
    });

    it('rechaza construirse con algo que no sea un IEstadoSolicitud', () => {
      expect(() => new Solicitud({ estado: 'Borrador' })).toThrow(TypeError);
    });
  });

  describe('transiciones válidas', () => {
    it('Borrador → Enviada al enviar', () => {
      solicitud.enviar();

      expect(solicitud.nombreEstado).toBe('Enviada');
      expect(solicitud.estado).toBeInstanceOf(EstadoEnviada);
    });

    it('Enviada → En Evaluación al evaluar', () => {
      solicitud.enviar().evaluar();

      expect(solicitud.nombreEstado).toBe('En Evaluación');
      expect(solicitud.estado).toBeInstanceOf(EstadoEnEvaluacion);
    });

    it('En Evaluación → Aprobada cuando el dictamen es favorable', () => {
      solicitud.enviar().evaluar().dictaminar(true);

      expect(solicitud.nombreEstado).toBe('Aprobada');
      expect(solicitud.estado).toBeInstanceOf(EstadoAprobada);
    });

    it('En Evaluación → Rechazada cuando el dictamen es desfavorable', () => {
      solicitud.enviar().evaluar().dictaminar(false);

      expect(solicitud.nombreEstado).toBe('Rechazada');
      expect(solicitud.estado).toBeInstanceOf(EstadoRechazada);
    });

    it('registra cada transición en el historial, en orden', () => {
      solicitud.enviar().evaluar().dictaminar(true);

      expect(solicitud.historial.map((t) => `${t.de}→${t.a}`)).toEqual([
        'Borrador→Enviada',
        'Enviada→En Evaluación',
        'En Evaluación→Aprobada',
      ]);
    });
  });

  describe('transiciones inválidas: deben fallar', () => {
    it('no se puede evaluar un Borrador', () => {
      expect(() => solicitud.evaluar()).toThrow(TransicionInvalidaError);
    });

    it('no se puede dictaminar un Borrador', () => {
      expect(() => solicitud.dictaminar(true)).toThrow(TransicionInvalidaError);
    });

    it('no se puede reenviar una solicitud ya Enviada', () => {
      solicitud.enviar();

      expect(() => solicitud.enviar()).toThrow(TransicionInvalidaError);
    });

    it('no se puede dictaminar sin haber pasado por evaluación', () => {
      solicitud.enviar();

      expect(() => solicitud.dictaminar(true)).toThrow(TransicionInvalidaError);
    });

    it('no se puede volver a evaluar una solicitud que ya está En Evaluación', () => {
      solicitud.enviar().evaluar();

      expect(() => solicitud.evaluar()).toThrow(TransicionInvalidaError);
    });

    it('Aprobada es estado final: ninguna acción la modifica', () => {
      solicitud.enviar().evaluar().dictaminar(true);

      expect(() => solicitud.enviar()).toThrow(TransicionInvalidaError);
      expect(() => solicitud.evaluar()).toThrow(TransicionInvalidaError);
      expect(() => solicitud.dictaminar(false)).toThrow(TransicionInvalidaError);
      expect(solicitud.nombreEstado).toBe('Aprobada');
    });

    it('Rechazada es estado final: ninguna acción la modifica', () => {
      solicitud.enviar().evaluar().dictaminar(false);

      expect(() => solicitud.dictaminar(true)).toThrow(TransicionInvalidaError);
      expect(solicitud.nombreEstado).toBe('Rechazada');
    });

    it('una transición inválida no altera el estado ni el historial', () => {
      expect(() => solicitud.dictaminar(true)).toThrow();

      expect(solicitud.nombreEstado).toBe('Borrador');
      expect(solicitud.historial).toHaveLength(0);
    });

    it('el error explica el estado actual y qué sí se puede hacer', () => {
      expect(() => solicitud.evaluar()).toThrow(
        'No se puede "evaluar" una solicitud en estado "Borrador". Acciones permitidas desde "Borrador": enviar.'
      );
    });

    it('el error de un estado final aclara que no admite acciones', () => {
      solicitud.enviar().evaluar().dictaminar(true);

      expect(() => solicitud.enviar()).toThrow(/ninguna \(estado final\)/);
    });

    it('el error lleva status 409 para que el middleware no lo trate como fallo técnico', () => {
      try {
        solicitud.evaluar();
        expect.unreachable('debió lanzar TransicionInvalidaError');
      } catch (error) {
        expect(error.status).toBe(409);
        expect(error.accion).toBe('evaluar');
        expect(error.estadoActual).toBe('Borrador');
      }
    });

    it('dictaminar exige un booleano explícito', () => {
      solicitud.enviar().evaluar();

      expect(() => solicitud.dictaminar('si')).toThrow(TypeError);
      expect(solicitud.nombreEstado).toBe('En Evaluación');
    });
  });

  describe('contrato de la interfaz IEstadoSolicitud', () => {
    it('la clase base exige implementar el getter nombre', () => {
      class EstadoIncompleto extends IEstadoSolicitud {}

      expect(() => new EstadoIncompleto().nombre).toThrow(/debe implementar/);
    });

    it('por defecto toda acción no declarada está prohibida', () => {
      class EstadoMudo extends IEstadoSolicitud {
        get nombre() {
          return 'Mudo';
        }
      }
      const muda = new Solicitud({ id: 1, estado: new EstadoMudo() });

      expect(() => muda.enviar()).toThrow(TransicionInvalidaError);
      expect(() => muda.evaluar()).toThrow(TransicionInvalidaError);
      expect(() => muda.dictaminar(true)).toThrow(TransicionInvalidaError);
    });

    it('cambiarEstado rechaza objetos que no sean estados', () => {
      expect(() => solicitud.cambiarEstado({ nombre: 'Falso' })).toThrow(TypeError);
    });
  });

  describe('reconstrucción del estado desde base de datos', () => {
    it('traduce cada nombre persistido a su clase de estado', () => {
      expect(crearEstadoDesdeNombre('Borrador')).toBeInstanceOf(EstadoBorrador);
      expect(crearEstadoDesdeNombre('Enviada')).toBeInstanceOf(EstadoEnviada);
      expect(crearEstadoDesdeNombre('En Evaluación')).toBeInstanceOf(EstadoEnEvaluacion);
      expect(crearEstadoDesdeNombre('Aprobada')).toBeInstanceOf(EstadoAprobada);
      expect(crearEstadoDesdeNombre('Rechazada')).toBeInstanceOf(EstadoRechazada);
    });

    it('falla con mensaje claro ante un estado desconocido en la BD', () => {
      expect(() => crearEstadoDesdeNombre('Archivada')).toThrow(/Estado desconocido: "Archivada"/);
    });

    it('nombresDeEstado lista los cinco estados del ciclo de vida', () => {
      expect(nombresDeEstado()).toEqual([
        'Borrador',
        'Enviada',
        'En Evaluación',
        'Aprobada',
        'Rechazada',
      ]);
    });

    it('una solicitud rehidratada continúa el ciclo desde donde quedó', () => {
      const enCurso = new Solicitud({ id: 9, estado: crearEstadoDesdeNombre('Enviada') });

      enCurso.evaluar();

      expect(enCurso.nombreEstado).toBe('En Evaluación');
    });
  });
});
