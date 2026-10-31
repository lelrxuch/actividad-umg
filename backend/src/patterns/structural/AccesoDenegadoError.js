/**
 * Error de dominio que lanza {@link DocumentoProxy} cuando el solicitante no
 * tiene derecho a ver el documento.
 *
 * Igual que TransicionInvalidaError del patrón State, se modela como clase
 * propia para que el controller responda 403 y no un 500. El mensaje dice qué
 * se intentó y con qué rol, pero deliberadamente NO revela de quién es el
 * documento ni qué datos contiene: un error de autorización no debería filtrar
 * la información que está protegiendo.
 */
export class AccesoDenegadoError extends Error {
  /**
   * @param {*} documentoId Documento solicitado.
   * @param {*} usuarioId Quien lo pidió.
   * @param {string} rol Rol con el que lo pidió.
   */
  constructor(documentoId, usuarioId, rol) {
    super(
      `El usuario ${usuarioId} (rol "${rol}") no tiene permiso para descargar ` +
        `el documento ${documentoId}.`
    );

    this.name = 'AccesoDenegadoError';
    this.documentoId = documentoId;
    this.usuarioId = usuarioId;
    this.rol = rol;
    this.status = 403;
  }
}
