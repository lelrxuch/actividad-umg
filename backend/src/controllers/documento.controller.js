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
