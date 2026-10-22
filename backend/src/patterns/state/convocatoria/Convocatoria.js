import { IEstadoConvocatoria } from './IEstadoConvocatoria.js';
import { EstadoBorradorConvocatoria } from './EstadoBorradorConvocatoria.js';

/**
 * Convocatoria de becas. Es el CONTEXTO del patrón State para su propio ciclo
 * de vida: Borrador → Publicada → Cerrada.
 *
 * No hay un solo `if` ni `switch` sobre el estado en esta clase. `publicar` y
 * `cerrar` se delegan al objeto estado actual, que decide si la transición es
 * válida y a qué estado se pasa. Las preguntas que el resto del sistema le hace
 * a la convocatoria —¿admite solicitudes?, ¿se puede editar?— también las
 * responde el estado, para que nadie fuera de estas clases compare cadenas.
 *
 * A diferencia de Solicitud, esta clase NO es sujeto del Observer: a nadie hay
 * que avisarle individualmente de que una convocatoria se publicó. El aviso a
 * los estudiantes, si alguna vez se hace, es una difusión y no una suscripción.
 */
export class Convocatoria {
  /** @type {IEstadoConvocatoria} */
  #estado;

  /**
   * @param {object} datos
   * @param {number|null} [datos.id]
   * @param {string} [datos.titulo]
   * @param {string|null} [datos.descripcion]
   * @param {string|Date|null} [datos.fechaApertura]
   * @param {string|Date|null} [datos.fechaCierre]
   * @param {string[]} [datos.modalidades] Tipos de beca que admite.
   * @param {IEstadoConvocatoria} [datos.estado] Por defecto Borrador.
   */
  constructor({
    id = null,
    titulo = '',
    descripcion = null,
    fechaApertura = null,
    fechaCierre = null,
    modalidades = [],
    estado = new EstadoBorradorConvocatoria(),
  } = {}) {
    if (!(estado instanceof IEstadoConvocatoria)) {
      throw new TypeError('El estado inicial debe ser una instancia de IEstadoConvocatoria.');
    }

    this.id = id;
    this.titulo = titulo;
    this.descripcion = descripcion;
    this.fechaApertura = fechaApertura;
    this.fechaCierre = fechaCierre;
    this.modalidades = [...modalidades];
    this.#estado = estado;
  }

  /** @returns {IEstadoConvocatoria} */
  get estado() {
    return this.#estado;
  }

  /** @returns {string} Nombre del estado actual, el que se persiste. */
  get nombreEstado() {
    return this.#estado.nombre;
  }

  /** @returns {string[]} */
  get accionesPermitidas() {
    return this.#estado.accionesPermitidas;
  }

  /** @returns {boolean} Si en este estado se pueden crear solicitudes contra ella. */
  get admiteSolicitudes() {
    return this.#estado.admiteSolicitudes;
  }

  /** @returns {boolean} Si en este estado se pueden editar sus datos. */
  get admiteEdicion() {
    return this.#estado.admiteEdicion;
  }

  /**
   * ¿La fecha dada cae dentro de la ventana de la convocatoria?
   *
   * Es una pregunta sobre las fechas, no sobre el estado, y por eso vive acá y
   * no en los estados. Una convocatoria sin fechas se considera siempre dentro
   * de ventana: el administrador decidió no acotarla.
   *
   * @param {Date} [momento]
   * @returns {boolean}
   */
  estaEnVentana(momento = new Date()) {
    const dia = new Date(momento).toISOString().slice(0, 10);
    const desde = this.fechaApertura ? new Date(this.fechaApertura).toISOString().slice(0, 10) : null;
    const hasta = this.fechaCierre ? new Date(this.fechaCierre).toISOString().slice(0, 10) : null;

    if (desde && dia < desde) return false;
    if (hasta && dia > hasta) return false;
    return true;
  }

  /**
   * ¿Admite esta modalidad de beca?
   *
   * Una convocatoria sin modalidades declaradas no admite ninguna: publicarla
   * así se bloquea en el service, y si alguna llegara en ese estado es más
   * seguro rechazar que aceptar todo.
   *
   * @param {string} tipo
   * @returns {boolean}
   */
  admiteModalidad(tipo) {
    return this.modalidades.includes(tipo);
  }

  /**
   * Reemplaza el estado actual. Lo invocan los propios estados cuando aceptan
   * una transición; no debe llamarse desde el service para saltarse las reglas.
   *
   * @param {IEstadoConvocatoria} nuevoEstado
   */
  cambiarEstado(nuevoEstado) {
    if (!(nuevoEstado instanceof IEstadoConvocatoria)) {
      throw new TypeError('El nuevo estado debe ser una instancia de IEstadoConvocatoria.');
    }

    this.#estado = nuevoEstado;
  }

  /**
   * Publica la convocatoria. Delega en el estado actual.
   * @throws {import('../TransicionInvalidaError.js').TransicionInvalidaError}
   * @returns {this}
   */
  publicar() {
    this.#estado.publicar(this);
    return this;
  }

  /**
   * Cierra la convocatoria. Delega en el estado actual.
   * @throws {import('../TransicionInvalidaError.js').TransicionInvalidaError}
   * @returns {this}
   */
  cerrar() {
    this.#estado.cerrar(this);
    return this;
  }

  /** @returns {object} Representación plana, apta para responder por API. */
  toJSON() {
    return {
      id: this.id,
      titulo: this.titulo,
      descripcion: this.descripcion,
      fechaApertura: this.fechaApertura,
      fechaCierre: this.fechaCierre,
      modalidades: [...this.modalidades],
      estado: this.nombreEstado,
      accionesPermitidas: this.accionesPermitidas,
      admiteSolicitudes: this.admiteSolicitudes,
    };
  }
}
