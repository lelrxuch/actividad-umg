// Lógica de negocio de Documentos.
//
// Punto de integración del patrón Proxy (backend/src/patterns/structural).
// El service nunca construye un DocumentoReal: siempre entrega un
// DocumentoProxy, de modo que no existe ningún camino en el código que lea un
// archivo sin pasar por el control de acceso. Esa es la garantía que da el
// patrón, y es la razón de que la verificación no viva aquí.
import * as documentoRepository from '../repositories/documento.repository.js';
import { DocumentoProxy } from '../patterns/structural/DocumentoProxy.js';

/**
 * Prepara el acceso a un documento, resolviendo quiénes son los evaluadores de
 * su solicitud y envolviéndolo en el proxy de protección.
 *
 * No lee el archivo: el proxy lo hará solo si la descarga está autorizada.
 *
 * @param {number} documentoId
 * @param {{id: *, rol: string}} usuario Quien pide el documento.
 * @param {object} [opciones]
 * @param {(ruta: string) => Promise<Buffer|string>} [opciones.almacenamiento]
 * @returns {Promise<DocumentoProxy>}
 * @throws {Error & { status: number }} 404 si el documento no existe.
 */
export async function obtenerDocumento(documentoId, usuario, { almacenamiento } = {}) {
  const fila = await documentoRepository.findById(documentoId);

  if (!fila) {
    const error = new Error(`No existe el documento ${documentoId}.`);
    error.status = 404;
    throw error;
  }

  const evaluadoresAsignados = await documentoRepository.evaluadoresDeSolicitud(fila.solicitudId);

  return new DocumentoProxy(fila, usuario, { evaluadoresAsignados, almacenamiento });
}

/**
 * Descarga un documento aplicando las reglas de acceso.
 *
 * @param {number} documentoId
 * @param {{id: *, rol: string}} usuario
 * @param {object} [opciones] Ver {@link obtenerDocumento}.
 * @returns {Promise<{id: *, tipo: string, nombreArchivo: string, contenido: Buffer|string}>}
 * @throws {Error & { status: number }} 404 si no existe.
 * @throws {import('../patterns/structural/AccesoDenegadoError.js').AccesoDenegadoError}
 *   403 si el usuario no es el dueño, ni evaluador asignado, ni administrador.
 */
export async function descargarDocumento(documentoId, usuario, opciones = {}) {
  const documento = await obtenerDocumento(documentoId, usuario, opciones);

  return documento.descargar();
}

/**
 * Informa si un usuario podría descargar un documento, sin descargarlo ni leer
 * el archivo. Sirve para que el frontend muestre u oculte el botón de descarga.
 *
 * @param {number} documentoId
 * @param {{id: *, rol: string}} usuario
 * @returns {Promise<{puedeDescargar: boolean, metadatos: object}>}
 */
export async function puedeDescargar(documentoId, usuario) {
  const documento = await obtenerDocumento(documentoId, usuario);

  return { puedeDescargar: documento.tieneAcceso(), metadatos: documento.metadatos };
}
