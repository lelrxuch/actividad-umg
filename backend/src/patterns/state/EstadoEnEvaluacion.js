import { IEstadoSolicitud } from './IEstadoSolicitud.js';
import { EstadoAprobada } from './EstadoAprobada.js';
import { EstadoRechazada } from './EstadoRechazada.js';

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

  /**
   * Transición válida: En Evaluación → Aprobada | Rechazada.
   * @param {import('./Solicitud.js').Solicitud} solicitud
   * @param {boolean} aprobado `true` aprueba la beca, `false` la rechaza.
   */
  dictaminar(solicitud, aprobado) {
    if (typeof aprobado !== 'boolean') {
      throw new TypeError('El dictamen requiere un valor booleano: true aprueba, false rechaza.');
    }

    solicitud.cambiarEstado(aprobado ? new EstadoAprobada() : new EstadoRechazada());
  }
}
