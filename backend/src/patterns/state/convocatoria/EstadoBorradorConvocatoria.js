import { IEstadoConvocatoria } from './IEstadoConvocatoria.js';
import { EstadoPublicada } from './EstadoPublicada.js';

/**
 * Patrón State — Estado concreto "Borrador" de una convocatoria.
 *
 * El administrador la está armando. Es el único estado que admite edición, y no
 * admite solicitudes: ningún estudiante la ha visto todavía.
 */
export class EstadoBorradorConvocatoria extends IEstadoConvocatoria {
  get nombre() {
    return 'Borrador';
  }

  get accionesPermitidas() {
    return ['editar', 'publicar'];
  }

  get admiteEdicion() {
    return true;
  }

  /**
   * Transición válida: Borrador → Publicada.
   *
   * Que la convocatoria esté COMPLETA para publicarse no lo decide el estado:
   * eso es una regla sobre los datos y vive en convocatoria.service. El estado
   * solo sabe desde dónde se puede publicar.
   *
   * @param {import('./Convocatoria.js').Convocatoria} convocatoria
   */
  publicar(convocatoria) {
    convocatoria.cambiarEstado(new EstadoPublicada());
  }
}
