// Lógica de negocio de Documentos.
//
// Punto de integración del patrón Proxy (backend/src/patterns/structural).
// El service nunca construye un DocumentoReal: siempre entrega un
// DocumentoProxy, de modo que no existe ningún camino en el código que lea un
// archivo sin pasar por el control de acceso. Esa es la garantía que da el
// patrón, y es la razón de que la verificación no viva aquí.
import * as documentoRepository from '../repositories/documento.repository.js';
import * as solicitudRepository from '../repositories/solicitud.repository.js';
import { DocumentoProxy } from '../patterns/structural/DocumentoProxy.js';
import { SolicitudFactory } from '../patterns/creational/SolicitudFactory.js';
import { guardarArchivo } from '../config/almacenamiento.js';
import { conTransaccion } from '../config/transaccion.js';
import { auditar, OPERACIONES } from './auditoria.service.js';

const ROL_AUTORIZADOR = 'autorizador';
const PENDIENTE_DE_AUTORIZACION = 'Pendiente de Autorización';

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

  // Solo para la autoridad autorizadora hace falta el estado de la solicitud.
  let esperaAutorizacion = false;
  if (usuario?.rol === ROL_AUTORIZADOR) {
    const solicitud = await solicitudRepository.findById(fila.solicitudId);
    esperaAutorizacion = solicitud?.estado === PENDIENTE_DE_AUTORIZACION;
  }

  return new DocumentoProxy(fila, usuario, { evaluadoresAsignados, almacenamiento, esperaAutorizacion });
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

/**
 * Tipos de documento que alguna modalidad de beca pide.
 *
 * Se deriva del Factory en vez de escribirse a mano: agregar una modalidad con
 * un papel nuevo lo admite sin tocar este archivo, y una modalidad que deje de
 * pedir un documento lo deja de admitir. Es la misma disciplina que en
 * solicitud.service: la lista vive en las clases de modalidad.
 *
 * @returns {Set<string>}
 */
function tiposDeDocumentoConocidos() {
  const tipos = new Set();

  for (const modalidad of SolicitudFactory.tiposDisponibles()) {
    for (const documento of SolicitudFactory.crearSolicitud(modalidad).documentosRequeridos) {
      tipos.add(documento);
    }
  }

  return tipos;
}

/**
 * Comprueba que el tipo de documento tenga sentido para esa solicitud.
 *
 * Si la solicitud tiene modalidad registrada, se le pregunta al Factory qué
 * papeles exige y se rechaza cualquier otro. Si no la tiene —`solicitudes.tipo`
 * es nullable y `solicitudRepository.crear` todavía no la persiste— no hay
 * forma de deducirla, así que se admite cualquier tipo que alguna modalidad
 * pida. Es deliberadamente lo más estricto que se puede ser con el dato que
 * hay: cuando la modalidad se persista, esta misma función se vuelve estricta
 * sola, sin cambios.
 *
 * @param {string} tipo
 * @param {string|null} modalidad Valor de solicitudes.tipo.
 * @throws {Error & { status: number }} 400 si el tipo no corresponde.
 */
function validarTipoDeDocumento(tipo, modalidad) {
  const admitidos = modalidad
    ? SolicitudFactory.crearSolicitud(modalidad).documentosRequeridos
    : [...tiposDeDocumentoConocidos()];

  if (!admitidos.includes(tipo)) {
    const detalle = modalidad ? `la beca "${modalidad}"` : 'ninguna modalidad de beca';
    const error = new Error(
      `El documento "${tipo}" no lo exige ${detalle}. Admitidos: ${admitidos.join(', ')}.`
    );
    error.status = 400;
    throw error;
  }
}

/**
 * Sube un documento al expediente de una solicitud.
 *
 * Orden de las comprobaciones, de la más barata a la más cara: primero las que
 * no tocan disco, y el archivo se escribe al final, cuando ya se sabe que la
 * fila va a entrar. Así un rechazo no deja basura en el directorio de subidas.
 *
 * @param {object} datos
 * @param {number} datos.solicitudId
 * @param {string} datos.tipo Tipo de documento: dni, titulo, carta.
 * @param {{nombreOriginal: string, contenido: Buffer}} datos.archivo
 * @param {{id: *, rol: string}} datos.usuario Quien sube.
 * @param {object} [opciones]
 * @param {Function} [opciones.almacenamiento] Escritor de archivos; por defecto
 *   el de config/almacenamiento. Inyectable para las pruebas.
 * @returns {Promise<object>} La fila creada.
 * @throws {Error & { status: number }} 400 datos inválidos, 403 si no es el
 *   dueño, 404 si la solicitud no existe, 409 si ya hay un documento de ese
 *   tipo o si la solicitud ya no admite cambios.
 */
export async function subirDocumento(
  { solicitudId, tipo, archivo, usuario },
  { almacenamiento = guardarArchivo } = {}
) {
  if (!archivo || !archivo.contenido || archivo.contenido.length === 0) {
    const error = new Error('No se recibió ningún archivo.');
    error.status = 400;
    throw error;
  }

  if (!tipo || typeof tipo !== 'string') {
    const error = new Error('Falta el tipo de documento.');
    error.status = 400;
    throw error;
  }

  const solicitud = await solicitudRepository.findById(solicitudId);

  if (!solicitud) {
    const error = new Error(`No existe la solicitud ${solicitudId}.`);
    error.status = 404;
    throw error;
  }

  // Quién puede subir no lo decide el Proxy: el Proxy protege la LECTURA de un
  // documento que ya existe. Acá la regla es más simple y es de la solicitud,
  // no del documento: su dueño, o un administrador.
  const esDueno = String(solicitud.estudiante_id) === String(usuario?.id);
  if (!esDueno && usuario?.rol !== 'administrador') {
    const error = new Error('No puede subir documentos a una solicitud ajena.');
    error.status = 403;
    throw error;
  }

  // El expediente se congela al enviarse: aceptar papeles después dejaría la
  // solicitud evaluada sobre un expediente distinto del que se envió.
  if (solicitud.estado !== 'Borrador') {
    const error = new Error(
      `La solicitud está en "${solicitud.estado}" y ya no admite documentos nuevos.`
    );
    error.status = 409;
    throw error;
  }

  validarTipoDeDocumento(tipo, solicitud.tipo);

  const yaCargados = await documentoRepository.listarDeSolicitud(solicitudId);
  if (yaCargados.some((documento) => documento.tipo === tipo)) {
    const error = new Error(`Ya hay un documento "${tipo}" en esta solicitud.`);
    error.status = 409;
    throw error;
  }

  const rutaArchivo = await almacenamiento({
    solicitudId,
    tipo,
    nombreOriginal: archivo.nombreOriginal,
    contenido: archivo.contenido,
  });

  // R3: el documento y su registro de auditoría van juntos.
  return conTransaccion(async () => {
    const documento = await documentoRepository.crear({
      solicitudId,
      estudianteId: solicitud.estudiante_id,
      tipo,
      nombreArchivo: archivo.nombreOriginal,
      rutaArchivo,
    });
    await auditar(OPERACIONES.SUBIDA_DOCUMENTO, {
      usuario,
      solicitudId: solicitud.id,
      detalle: { tipo, nombreArchivo: archivo.nombreOriginal },
    });
    return documento;
  });
}

/**
 * Documentos ya cargados en una solicitud, para que el estudiante vea su avance.
 *
 * @param {number} solicitudId
 * @param {{id: *, rol: string}} usuario
 * @returns {Promise<{solicitudId: number, documentos: Array}>}
 * @throws {Error & { status: number }} 403 si la solicitud no es suya, 404 si
 *   no existe.
 */
export async function listarDocumentos(solicitudId, usuario) {
  const solicitud = await solicitudRepository.findById(solicitudId);

  if (!solicitud) {
    const error = new Error(`No existe la solicitud ${solicitudId}.`);
    error.status = 404;
    throw error;
  }

  const esDueno = String(solicitud.estudiante_id) === String(usuario?.id);
  const evaluadores = await documentoRepository.evaluadoresDeSolicitud(solicitudId);
  const esEvaluadorAsignado =
    usuario?.rol === 'evaluador' && evaluadores.some((id) => String(id) === String(usuario?.id));

  const autorizaEsta = usuario?.rol === ROL_AUTORIZADOR && solicitud.estado === PENDIENTE_DE_AUTORIZACION;

  if (!esDueno && !esEvaluadorAsignado && !autorizaEsta && usuario?.rol !== 'administrador') {
    const error = new Error('No tiene acceso a esta solicitud.');
    error.status = 403;
    throw error;
  }

  return { solicitudId, documentos: await documentoRepository.listarDeSolicitud(solicitudId) };
}
