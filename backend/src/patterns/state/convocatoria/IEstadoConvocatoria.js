import { TransicionInvalidaError } from '../TransicionInvalidaError.js';

/**
 * Patrón State — Interfaz de los estados de una Convocatoria.
 *
 * PROBLEMA QUE RESUELVE:
 * Una convocatoria de becas no se puede modificar igual en cualquier momento.
 * Mientras es borrador el administrador la arma libremente; una vez publicada
 * los estudiantes ya la vieron y cambiar sus requisitos o sus fechas movería el
 * piso a quien ya aplicó; una vez cerrada no admite nada. Escrito con
 * `if (estado === ...)` esa regla queda repartida por cada operación del
 * service y hay que recordarla entera cada vez que se agrega una.
 *
 * Es el mismo patrón que gobierna el ciclo de vida de la Solicitud, aplicado a
 * un segundo ciclo de vida distinto. Comparte TransicionInvalidaError, que ya
 * lleva status 409, para que el controller no tenga que distinguir de qué
 * dominio viene el error.
 *
 * DISEÑO:
 * Esta clase base implementa las transiciones lanzando TransicionInvalidaError.
 * Cada estado concreto sobrescribe solo las que acepta, así que toda transición
 * no declarada queda prohibida por omisión.
 *
 * @abstract
 */
export class IEstadoConvocatoria {
  /**
   * Nombre legible del estado, el que se persiste en convocatorias.estado.
   * @returns {string}
   * @abstract
   */
  get nombre() {
    throw new Error(`${this.constructor.name} debe implementar el getter "nombre".`);
  }

  /** @returns {string[]} Acciones que este estado acepta. */
  get accionesPermitidas() {
    return [];
  }

  /**
   * ¿Admite solicitudes nuevas? Solo una convocatoria publicada las admite, y
   * el estado lo responde él mismo para que el service no compare cadenas.
   * @returns {boolean}
   */
  get admiteSolicitudes() {
    return false;
  }

  /**
   * ¿Se pueden editar título, fechas o modalidades?
   * @returns {boolean}
   */
  get admiteEdicion() {
    return false;
  }

  /**
   * Borrador → Publicada.
   * @param {import('./Convocatoria.js').Convocatoria} convocatoria
   * @throws {TransicionInvalidaError}
   */
  publicar(convocatoria) {
    throw new TransicionInvalidaError('publicar', this.nombre, this.accionesPermitidas);
  }

  /**
   * Publicada → Cerrada.
   * @param {import('./Convocatoria.js').Convocatoria} convocatoria
   * @throws {TransicionInvalidaError}
   */
  cerrar(convocatoria) {
    throw new TransicionInvalidaError('cerrar', this.nombre, this.accionesPermitidas);
  }
}
