import { IDocumento } from './IDocumento.js';
import { DocumentoReal } from './DocumentoReal.js';
import { AccesoDenegadoError } from './AccesoDenegadoError.js';

/** Rol con acceso irrestricto a los expedientes. */
const ROL_ADMINISTRADOR = 'administrador';

/**
 * Patrón Proxy — Proxy de protección y de carga diferida.
 *
 * PROBLEMA QUE RESUELVE:
 * Dos cosas a la vez, y ninguna le corresponde al documento mismo:
 *
 *   1. PROTECCIÓN. Los documentos de un expediente solo pueden verlos su dueño,
 *      los evaluadores asignados a esa solicitud y los administradores. Metida
 *      en {@link DocumentoReal}, esa regla ensuciaría el acceso al archivo;
 *      metida en el controller, se repetiría en cada endpoint que entregue un
 *      documento y bastaría olvidarla una vez para filtrar un DPI.
 *
 *   2. CARGA DIFERIDA. El archivo no se lee al construir el proxy, sino en el
 *      primer `descargar()` autorizado. Si el permiso falla, el documento real
 *      ni se instancia: no se gasta una lectura de disco (ni una petición a S3)
 *      para algo que se va a rechazar, y un atacante que pruebe identificadores
 *      al azar no genera tráfico de almacenamiento.
 *
 * Como implementa la misma interfaz {@link IDocumento} que el documento real,
 * el service que lo usa no distingue uno de otro.
 */
export class DocumentoProxy extends IDocumento {
  /** @type {DocumentoReal|null} Se crea en el primer acceso autorizado. */
  #real = null;

  /**
   * @param {{id: *, tipo: string, nombreArchivo: string, rutaArchivo: string,
   *   estudianteId: *, solicitudId: *}} fila Metadatos del documento.
   * @param {{id: *, rol: string}} usuario Quien pide el documento.
   * @param {object} [opciones]
   * @param {Array<*>} [opciones.evaluadoresAsignados] Ids de los evaluadores de
   *   esa solicitud. Se recibe ya resuelto para que el proxy no consulte la base
   *   de datos: su responsabilidad es decidir, no averiguar.
   * @param {(ruta: string) => Promise<Buffer|string>} [opciones.almacenamiento]
   */
  constructor(fila, usuario, { evaluadoresAsignados = [], almacenamiento } = {}) {
    super();

    if (!usuario || usuario.id === undefined || usuario.id === null) {
      throw new TypeError('DocumentoProxy requiere el usuario que solicita el documento.');
    }

    this.fila = fila;
    this.usuario = usuario;
    this.evaluadoresAsignados = evaluadoresAsignados;
    this.almacenamiento = almacenamiento;
  }

  /** @returns {object} Metadatos; visibles sin leer el archivo. */
  get metadatos() {
    return { ...this.fila };
  }

  /**
   * ¿Ya se instanció el documento real? Las pruebas de carga diferida lo
   * consultan para comprobar que un acceso denegado no toca el almacenamiento.
   * @returns {boolean}
   */
  get realCargado() {
    return this.#real !== null;
  }

  /**
   * Evalúa las tres reglas de acceso.
   *
   * @returns {boolean} `true` si el solicitante es el dueño del expediente, un
   *   evaluador asignado a esa solicitud, o un administrador.
   */
  tieneAcceso() {
    const { id, rol } = this.usuario;

    if (rol === ROL_ADMINISTRADOR) return true;
    if (this.fila?.estudianteId === id) return true;

    return this.evaluadoresAsignados.includes(id);
  }

  /**
   * Verifica el permiso y, solo entonces, delega en el documento real.
   *
   * @returns {Promise<{id: *, tipo: string, nombreArchivo: string, contenido: Buffer|string}>}
   * @throws {AccesoDenegadoError} 403 si el solicitante no cumple ninguna regla.
   */
  async descargar() {
    if (!this.tieneAcceso()) {
      throw new AccesoDenegadoError(this.fila?.id, this.usuario.id, this.usuario.rol);
    }

    // Carga diferida: el real se crea aquí, nunca en el constructor, y se
    // reutiliza en descargas sucesivas del mismo proxy.
    this.#real ??= new DocumentoReal(this.fila, { almacenamiento: this.almacenamiento });

    return this.#real.descargar();
  }
}
