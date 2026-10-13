// Controller del módulo Solicitudes — catálogo de modalidades (SCRUM-41).
//
// Expone lo que el Factory Method ya sabe: qué modalidades de beca existen y
// qué documentación exige cada una. No hay un `switch` sobre el tipo aquí ni en
// el service: la lista sale de SolicitudFactory y los documentos del propio
// producto concreto, así que agregar una beca nueva no toca este archivo.
//
// POR QUÉ ES PÚBLICO (sin `autenticado`):
// El estudiante necesita ver qué papeles le van a pedir ANTES de registrarse.
// Si estos endpoints exigieran sesión, la pantalla de requisitos solo existiría
// para quien ya tiene cuenta, que es justo al revés de lo que pide la historia.
// No devuelven ningún dato de ninguna persona: es catálogo estático.
import * as solicitudService from '../services/solicitud.service.js';

/** Convierte un error de negocio en respuesta HTTP. */
function responderError(res, error) {
  return res
    .status(error.status || 500)
    .json({ error: error.status ? error.message : 'Error interno del servidor.' });
}

/**
 * GET /api/solicitudes/tipos
 *
 * Modalidades disponibles. El frontend arma el selector con esto en vez de
 * tener la lista duplicada en JavaScript.
 */
export function listarTipos(req, res) {
  try {
    res.json({ tipos: solicitudService.tiposDeBeca() });
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * GET /api/solicitudes/tipos/:tipo/documentos
 *
 * Documentación exigida por una modalidad, sin iniciar ninguna solicitud.
 * 400 con la lista de tipos válidos si la modalidad no existe.
 */
export function listarDocumentos(req, res) {
  try {
    const { tipo } = req.params;
    res.json({ tipo, documentos: solicitudService.documentosRequeridos(tipo) });
  } catch (error) {
    responderError(res, error);
  }
}
