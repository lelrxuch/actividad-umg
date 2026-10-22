import { IEstadoConvocatoria } from './IEstadoConvocatoria.js';

/**
 * Patrón State — Estado concreto "Cerrada".
 *
 * Estado final. No hereda ninguna transición porque la clase base las prohíbe
 * todas por omisión: una convocatoria cerrada no se reabre, no se edita y no
 * admite solicitudes. Reabrirla sería una convocatoria nueva.
 */
export class EstadoCerrada extends IEstadoConvocatoria {
  get nombre() {
    return 'Cerrada';
  }
}
