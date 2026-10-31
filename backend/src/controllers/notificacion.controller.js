import * as notificacionService from '../services/notificacion.service.js';

/** El JWT guarda el identificador en `sub`, como en los demás controllers. */
function solicitante(req) {
  const token = req.usuario || {};
  return { id: token.sub ?? token.id, rol: token.rol };
}

/** Un error sin `status` es inesperado: su mensaje no sale al cliente. */
function responderError(res, error) {
  if (!error.status) {
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
  return res.status(error.status).json({ error: error.message });
}

/**
 * GET /api/notificaciones
 * Los avisos del usuario en sesión.
 */
export async function listarMias(req, res) {
  try {
    res.json(await notificacionService.listarMias(solicitante(req)));
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * PATCH /api/notificaciones/:id/leida
 * Marca un aviso propio como leído.
 */
export async function marcarLeida(req, res) {
  try {
    res.json(await notificacionService.marcarLeida(req.params.id, solicitante(req)));
  } catch (error) {
    responderError(res, error);
  }
}
