import { IEstadoSolicitud } from './IEstadoSolicitud.js';

/**
 * Patrón State — Estado concreto "Aprobada" (final).
 *
 * La beca fue otorgada. Es un estado terminal: no hereda ninguna transición
 * válida, por lo que cualquier acción sobre él lanza TransicionInvalidaError
 * gracias al comportamiento por defecto de {@link IEstadoSolicitud}. Esto
 * protege contra reprocesos que alterarían un dictamen ya comunicado al
 * estudiante.
 */
export class EstadoAprobada extends IEstadoSolicitud {
  get nombre() {
    return 'Aprobada';
  }

  get esFinal() {
    return true;
  }
}
