import * as auditoriaService from '../services/auditoria.service.js';

/** El JWT guarda el identificador en `sub`, como en los demás controllers. */
function solicitante(req) {
  const token = req.usuario || {};
  return { id: token.sub ?? token.id, rol: token.rol };
}

/**
 * GET /api/auditoria?solicitudId=&limite=
 * Solo administrador.
 */
export async function consultar(req, res) {
  try {
    const { solicitudId, limite } = req.query ?? {};
    res.json(await auditoriaService.consultar(solicitante(req), { solicitudId, limite }));
  } catch (error) {
    if (!error.status) {
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
    res.status(error.status).json({ error: error.message });
  }
}
