import { IDocumento } from './IDocumento.js';

/**
 * Patrón Proxy — Sujeto real (RealSubject).
 *
 * PROBLEMA QUE RESUELVE:
 * Nada, por sí sola: esta clase hace exactamente una cosa, que es traer el
 * archivo. Su virtud es lo que NO contiene. No sabe de roles, de dueños ni de
 * evaluadores asignados; si lo supiera, cada regla nueva de autorización
 * obligaría a modificar el acceso al almacenamiento, y acabaríamos con
 * permisos repartidos entre la capa de archivos y la de negocio.
 *
 * Mantenerla ignorante es lo que hace que el proxy valga la pena.
 */
export class DocumentoReal extends IDocumento {
  /**
   * @param {{id: *, tipo: string, nombreArchivo: string, rutaArchivo: string,
   *   estudianteId: *, solicitudId: *}} fila Metadatos del documento, tal como
   *   los devuelve el repositorio.
   * @param {object} [opciones]
   * @param {(ruta: string) => Promise<Buffer|string>} [opciones.almacenamiento]
   *   Lector del archivo. Inyectarlo permite cambiar disco local por S3 sin
   *   tocar esta clase, y probarla sin tocar el sistema de archivos.
   */
  constructor(fila, { almacenamiento } = {}) {
    super();
    this.fila = fila;
    this.almacenamiento = almacenamiento ?? DocumentoReal.lectorNoConfigurado;
    /** @type {number} Veces que se leyó el archivo; lo usan las pruebas de carga diferida. */
    this.lecturas = 0;
  }

  /**
   * Lector por defecto. Falla de forma explícita en lugar de devolver un
   * contenido falso: el ticket de almacenamiento de archivos todavía no está
   * hecho, y un stub silencioso escondería eso.
   * @param {string} ruta
   */
  static async lectorNoConfigurado(ruta) {
    throw new Error(
      `No hay almacenamiento configurado para leer "${ruta}". ` +
        'Inyecte `almacenamiento` al construir DocumentoReal.'
    );
  }

  /** @returns {object} Metadatos; no requiere leer el archivo. */
  get metadatos() {
    return { ...this.fila };
  }

  /**
   * Lee el archivo y lo devuelve junto con sus metadatos.
   * @returns {Promise<{id: *, tipo: string, nombreArchivo: string, contenido: Buffer|string}>}
   */
  async descargar() {
    const contenido = await this.almacenamiento(this.fila.rutaArchivo);
    this.lecturas += 1;

    return {
      id: this.fila.id,
      tipo: this.fila.tipo,
      nombreArchivo: this.fila.nombreArchivo,
      contenido,
    };
  }
}
