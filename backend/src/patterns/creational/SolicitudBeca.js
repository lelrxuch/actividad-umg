/**
 * Patrón Factory Method — Producto abstracto.
 *
 * PROBLEMA QUE RESUELVE:
 * Cada modalidad de beca del MINEDUC exige documentación distinta. Resuelto sin
 * patrón, el service termina con un `switch (tipo)` que devuelve arrays de
 * requisitos a mano, repetido en cada lugar que necesita saber qué papeles pide
 * una beca: al crear la solicitud, al armar el expediente, al validarlo. Cada
 * modalidad nueva obliga a buscar y tocar todos esos switch.
 *
 * El Factory Method encapsula cada modalidad en su propia clase, que es la
 * única dueña de sus requisitos. El código cliente pide una solicitud por su
 * nombre de tipo y recibe un objeto que ya sabe qué documentos exige; nunca
 * nombra las clases concretas ni enumera requisitos.
 *
 * @abstract
 */
export class SolicitudBeca {
  /**
   * Nombre del tipo de beca, tal como se recibe por API y se guardaría en BD.
   * @returns {string}
   * @abstract
   */
  get tipo() {
    throw new Error(`${this.constructor.name} debe implementar el getter "tipo".`);
  }

  /**
   * Documentos mínimos que el expediente debe contener para esta modalidad.
   * @returns {string[]} Claves de documento: 'dni', 'titulo', 'carta'.
   * @abstract
   */
  get documentosRequeridos() {
    throw new Error(`${this.constructor.name} debe implementar el getter "documentosRequeridos".`);
  }

  /**
   * Nivel académico que debe acreditar el título, cuando la modalidad lo exige.
   *
   * Es lo que diferencia a posgrado de universitaria: ambas piden los mismos
   * tres documentos, pero no sirve el mismo título.
   *
   * @returns {string|null} `null` si la modalidad no exige título.
   */
  get nivelTituloRequerido() {
    return null;
  }

  /**
   * Representación plana, apta para responder por API.
   * @returns {{tipo: string, documentosRequeridos: string[], nivelTituloRequerido: string|null}}
   */
  toJSON() {
    return {
      tipo: this.tipo,
      documentosRequeridos: this.documentosRequeridos,
      nivelTituloRequerido: this.nivelTituloRequerido,
    };
  }
}
