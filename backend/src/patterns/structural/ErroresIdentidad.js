/**
 * Errores de dominio de la validación de identidad.
 *
 * Se agrupan en un archivo porque son dos caras del mismo asunto y siempre se
 * importan juntas: una distingue "el CUI está mal" (culpa del solicitante, 400)
 * de "no pudimos preguntar" (culpa del proveedor, 503). Esa distinción es la
 * razón de ser de las clases: un 503 es reintentable y un 400 no, y el
 * controller necesita poder decidirlo sin inspeccionar mensajes de texto.
 */

/** El CUI no tiene formato válido o el registro no lo reconoce. */
export class IdentidadNoValidaError extends Error {
  /**
   * @param {string} cui CUI consultado.
   * @param {string} motivo Explicación apta para mostrarle al estudiante.
   */
  constructor(cui, motivo) {
    super(`No se pudo validar la identidad del CUI ${cui}: ${motivo}`);

    this.name = 'IdentidadNoValidaError';
    this.cui = cui;
    this.motivo = motivo;
    this.status = 400;
  }
}

/** El registro externo no respondió o respondió con un fallo propio. */
export class ServicioIdentidadNoDisponibleError extends Error {
  /**
   * @param {string} proveedor Nombre del registro consultado.
   * @param {Error} causa Error original del cliente externo.
   */
  constructor(proveedor, causa) {
    super(`El servicio de ${proveedor} no está disponible: ${causa.message}`);

    this.name = 'ServicioIdentidadNoDisponibleError';
    this.proveedor = proveedor;
    this.causa = causa;
    this.status = 503;
  }
}
