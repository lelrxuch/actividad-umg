import { IEstadoConvocatoria } from './IEstadoConvocatoria.js';
import { EstadoCerrada } from './EstadoCerrada.js';

/**
 * Patrón State — Estado concreto "Publicada".
 *
 * Los estudiantes ya la ven y pueden aplicar. No admite edición a propósito:
 * cambiarle los requisitos o las fechas a una convocatoria abierta le movería
 * el piso a quien ya armó su expediente contra la versión anterior.
 */
export class EstadoPublicada extends IEstadoConvocatoria {
  get nombre() {
    return 'Publicada';
  }

  get accionesPermitidas() {
    return ['cerrar'];
  }

  get admiteSolicitudes() {
    return true;
  }

  /**
   * Transición válida: Publicada → Cerrada.
   * @param {import('./Convocatoria.js').Convocatoria} convocatoria
   */
  cerrar(convocatoria) {
    convocatoria.cambiarEstado(new EstadoCerrada());
  }
}
