import { SolicitudBeca } from './SolicitudBeca.js';
import { ExpedienteIncompletoError } from './ExpedienteIncompletoError.js';

/**
 * Patrón Builder — Constructor de expedientes.
 *
 * PROBLEMA QUE RESUELVE:
 * El estudiante sube sus documentos en cualquier orden y a lo largo de varios
 * días. Un constructor con todos los parámetros (`new Expediente(dni, titulo,
 * carta)`) obligaría a tenerlos todos a la vez y a recordar su posición; dejar
 * el objeto a medio llenar y validarlo "más tarde, en algún lado" es la vía
 * directa a expedientes incompletos aceptados por el sistema.
 *
 * El Builder separa el llenado de la validación: los `agregar*` aceptan los
 * documentos en cualquier orden y `build()` es el único punto donde se decide
 * si el expediente está completo, usando los requisitos que publica el propio
 * tipo de beca. Mientras no se llame a `build()` no existe ningún expediente;
 * por eso no hay estados intermedios inválidos circulando por el sistema.
 */
export class ExpedienteBuilder {
  /** @type {SolicitudBeca} */
  #tipoBeca;

  /** @type {Record<string, object>} */
  #documentos = {};

  /**
   * @param {SolicitudBeca} tipoBeca Producto devuelto por SolicitudFactory, que
   *   es quien conoce los requisitos de la modalidad. Recibirlo por constructor
   *   mantiene al Builder ignorante de las modalidades concretas.
   */
  constructor(tipoBeca) {
    if (!(tipoBeca instanceof SolicitudBeca)) {
      throw new TypeError(
        'ExpedienteBuilder requiere un tipo de beca creado con SolicitudFactory.crearSolicitud().'
      );
    }

    this.#tipoBeca = tipoBeca;
  }

  /**
   * Adjunta el documento personal de identificación (DPI).
   * @param {string} numero Número de DPI.
   * @returns {this} Para encadenar.
   */
  agregarDNI(numero) {
    this.#documentos.dni = { tipo: 'dni', numero };
    return this;
  }

  /**
   * Adjunta el título académico.
   * @param {{nivel?: string, institucion?: string}} [datos] `nivel` debe coincidir
   *   con el que exige la modalidad ('diversificado', 'licenciatura').
   * @returns {this} Para encadenar.
   */
  agregarTitulo({ nivel, institucion } = {}) {
    this.#documentos.titulo = { tipo: 'titulo', nivel, institucion };
    return this;
  }

  /**
   * Adjunta la carta de recomendación o de exposición de motivos.
   * @param {{autor?: string, contenido?: string}} [datos]
   * @returns {this} Para encadenar.
   */
  agregarCarta({ autor, contenido } = {}) {
    this.#documentos.carta = { tipo: 'carta', autor, contenido };
    return this;
  }

  /**
   * Cierra el expediente y lo valida contra los requisitos de la modalidad.
   *
   * @returns {Readonly<{tipoBeca: string, documentos: string[], detalle: object}>}
   *   Expediente inmutable; congelarlo evita que alguien le agregue o quite
   *   documentos después de haber pasado la validación.
   * @throws {ExpedienteIncompletoError} Si falta un documento obligatorio o el
   *   título no acredita el nivel que la modalidad exige.
   */
  build() {
    const faltantes = this.#tipoBeca.documentosRequeridos.filter(
      (requerido) => !this.#documentos[requerido]
    );

    const nivelExigido = this.#tipoBeca.nivelTituloRequerido;
    if (nivelExigido && this.#documentos.titulo && this.#documentos.titulo.nivel !== nivelExigido) {
      faltantes.push(`titulo de nivel ${nivelExigido}`);
    }

    if (faltantes.length > 0) {
      throw new ExpedienteIncompletoError(this.#tipoBeca.tipo, faltantes);
    }

    return Object.freeze({
      tipoBeca: this.#tipoBeca.tipo,
      documentos: Object.keys(this.#documentos),
      detalle: Object.freeze({ ...this.#documentos }),
    });
  }
}
