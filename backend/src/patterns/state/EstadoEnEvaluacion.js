import { IEstadoSolicitud } from './IEstadoSolicitud.js';
import { EstadoAprobada } from './EstadoAprobada.js';
import { EstadoRechazada } from './EstadoRechazada.js';
import { EstadoPendienteAutorizacion } from './EstadoPendienteAutorizacion.js';

/**
 * Patrón State — Estado concreto "En Evaluación".
 *
 * Un analista tiene la solicitud bajo revisión. Es el único estado desde el que
 * se puede emitir un dictamen, y es también el punto donde el patrón State se
 * paga solo: la misma acción (`dictaminar`) deriva en dos estados distintos
 * según el resultado, sin que el service necesite saber nada de esa bifurcación.
 */
export class EstadoEnEvaluacion extends IEstadoSolicitud {
  get nombre() {
    return 'En Evaluación';
  }

  get accionesPermitidas() {
    return ['dictaminar'];
  }

  get admiteEvaluadores() {
    return true;
  }

  /**
   * Transición válida: En Evaluación → Aprobada | Rechazada.
   * @param {import('./Solicitud.js').Solicitud} solicitud
   * @param {boolean} aprobado `true` aprueba la beca, `false` la rechaza.
   */
  /**
   * Dictamen del evaluador.
   *
   * Si la solicitud requiere una segunda aprobación (monto mayor al umbral),
   * aprobar no la deja Aprobada: la pasa a Pendiente de Autorización. Rechazar
   * siempre la deja Rechazada. Quién decide si requiere la segunda aprobación
   * es el service, que conoce el monto; el estado solo sabe a dónde ir.
   *
   * @param {import('./Solicitud.js').Solicitud} solicitud
   * @param {boolean} aprobado
   * @param {{requiereAutorizacion?: boolean}} [opciones]
   */
  dictaminar(solicitud, aprobado, { requiereAutorizacion = false } = {}) {
    if (typeof aprobado !== 'boolean') {
      throw new TypeError('El dictamen requiere un valor booleano: true aprueba, false rechaza.');
    }

    if (!aprobado) {
      solicitud.cambiarEstado(new EstadoRechazada());
      return;
    }

    solicitud.cambiarEstado(
      requiereAutorizacion ? new EstadoPendienteAutorizacion() : new EstadoAprobada()
    );
  }
}
