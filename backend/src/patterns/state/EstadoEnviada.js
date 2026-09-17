import { IEstadoSolicitud } from './IEstadoSolicitud.js';
import { EstadoEnEvaluacion } from './EstadoEnEvaluacion.js';

/**
 * Patrón State — Estado concreto "Enviada".
 *
 * La solicitud ya fue entregada por el estudiante y espera que un analista la
 * tome. La única transición válida es pasarla a evaluación. Reenviarla queda
 * bloqueado a propósito: evita envíos duplicados que generarían notificaciones
 * repetidas al estudiante. Dictaminar sin haberla evaluado también se bloquea,
 * porque saltarse la evaluación rompería la trazabilidad del proceso.
 */
export class EstadoEnviada extends IEstadoSolicitud {
  get nombre() {
    return 'Enviada';
  }

  get accionesPermitidas() {
    return ['evaluar'];
  }

  /**
   * Transición válida: Enviada → En Evaluación.
   * @param {import('./Solicitud.js').Solicitud} solicitud
   */
  evaluar(solicitud) {
    solicitud.cambiarEstado(new EstadoEnEvaluacion());
  }
}
