/**
 * Patrón Proxy — Interfaz común (Subject).
 *
 * PROBLEMA QUE RESUELVE:
 * Es el contrato que comparten el documento real y su proxy. Gracias a que los
 * dos lo implementan, el service que descarga un documento no puede distinguir
 * si está hablando con el archivo o con el control de acceso: recibe algo que
 * sabe `descargar()` y eso le basta. Esa indistinguibilidad es lo que permite
 * insertar permisos y carga diferida sin cambiar una línea del llamador.
 *
 * @abstract
 */
export class IDocumento {
  /**
   * Entrega el contenido del documento.
   * @returns {Promise<{id: *, tipo: string, nombreArchivo: string, contenido: Buffer|string}>}
   * @abstract
   */
  async descargar() {
    throw new Error(`${this.constructor.name} debe implementar el método "descargar()".`);
  }

  /**
   * Datos del documento que no exigen leer el archivo (tipo, dueño, ruta).
   * @returns {object}
   * @abstract
   */
  get metadatos() {
    throw new Error(`${this.constructor.name} debe implementar el getter "metadatos".`);
  }
}
