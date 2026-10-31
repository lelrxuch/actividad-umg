// Controller del módulo Documentos (SCRUM-44).
//
// El control de acceso NO está aquí: vive en DocumentoProxy, y esa es
// justamente la garantía del patrón. Este controller se limita a identificar
// quién pide el documento y a traducir el resultado a HTTP. Si alguna vez
// aparece aquí un `if` sobre roles, el Proxy dejó de servir para lo que se
// puso.
import * as documentoService from '../services/documento.service.js';
import { leerArchivo } from '../config/almacenamiento.js';

/**
 * Traduce el payload del token al usuario que espera el dominio.
 *
 * auth.middleware deja en req.usuario el contenido del JWT, cuyo identificador
 * es `sub` por convención de la especificación. El Proxy y el resto del
 * dominio hablan de `id`. Sin esta conversión, usuario.id llega undefined, el
 * Proxy no reconoce al dueño y todas las descargas darían 403.
 *
 * @param {object} req
 * @returns {{id: *, rol: string}}
 */
function solicitante(req) {
  const token = req.usuario || {};
  return { id: token.sub ?? token.id, rol: token.rol };
}

function responderError(res, error) {
  return res
    .status(error.status || 500)
    .json({ error: error.status ? error.message : 'Error interno del servidor.' });
}

/**
 * GET /api/documentos/:id/descargar
 *
 * 200 con el archivo, 403 si no tiene permiso, 404 si el documento no existe
 * o su archivo no está en el almacenamiento.
 */
export async function descargarDocumento(req, res) {
  try {
    const documento = await documentoService.descargarDocumento(
      Number(req.params.id),
      solicitante(req),
      { almacenamiento: leerArchivo }
    );

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(documento.nombreArchivo)}"`
    );
    res.send(documento.contenido);
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * GET /api/documentos/:id/permiso
 *
 * Informa si el solicitante podría descargar, sin leer el archivo. Sirve para
 * que el frontend muestre u oculte el botón sin provocar un 403.
 */
export async function consultarPermiso(req, res) {
  try {
    res.json(await documentoService.puedeDescargar(Number(req.params.id), solicitante(req)));
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * POST /api/documentos
 * multipart/form-data: campo `archivo` + campos `solicitudId` y `tipo`.
 *
 * 201 con la fila creada. 400 si falta el archivo o el tipo no corresponde a
 * la modalidad, 403 si la solicitud no es suya, 404 si no existe, 409 si ya
 * hay un documento de ese tipo o la solicitud ya se envió.
 */
export async function subirDocumento(req, res) {
  try {
    const { solicitudId, tipo } = req.body || {};

    const documento = await documentoService.subirDocumento({
      solicitudId: Number(solicitudId),
      tipo,
      archivo: req.file
        ? { nombreOriginal: req.file.originalname, contenido: req.file.buffer }
        : null,
      usuario: solicitante(req),
    });

    res.status(201).json({ documento });
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * GET /api/documentos/solicitud/:solicitudId
 *
 * Lo que el estudiante lleva subido. No devuelve rutas de archivo: solo id,
 * tipo y nombre visible, que es lo que la pantalla necesita para marcar el
 * avance del expediente.
 */
export async function listarDocumentos(req, res) {
  try {
    res.json(
      await documentoService.listarDocumentos(Number(req.params.solicitudId), solicitante(req))
    );
  } catch (error) {
    responderError(res, error);
  }
}
