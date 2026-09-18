import { IEstadoSolicitud } from './IEstadoSolicitud.js';
import { EstadoEnviada } from './EstadoEnviada.js';

/**
 * Patrón State — Estado concreto "Borrador".
 *
 * Estado inicial de toda solicitud. El estudiante todavía la está completando,
 * por lo que la única transición válida es enviarla a revisión. Evaluar o
 * dictaminar un borrador no tiene sentido de negocio y queda bloqueado por la
 * implementación por defecto de {@link IEstadoSolicitud}.
 */
export class EstadoBorrador extends IEstadoSolicitud {
  get nombre() {
    return 'Borrador';
  }

  get accionesPermitidas() {
    return ['enviar'];
  }

  /**
   * Transición válida: Borrador → Enviada.
   * @param {import('./Solicitud.js').Solicitud} solicitud
   */
  enviar(solicitud) {
    solicitud.cambiarEstado(new EstadoEnviada());
  }
}
