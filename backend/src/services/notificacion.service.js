// Consulta de las notificaciones del usuario en sesión.
//
// Un usuario solo ve y marca SUS avisos. El dueño sale siempre del token, nunca
// de la URL ni del cuerpo de la petición, y el filtro va en la consulta.
import * as notificacionRepository from '../repositories/notificacion.repository.js';

function errorDeNegocio(mensaje, status) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function exigirUsuario(usuario) {
  if (!usuario || usuario.id === undefined || usuario.id === null) {
    throw errorDeNegocio('No se identificó a quien solicita la acción.', 403);
  }
}

/**
 * Los avisos del usuario, del más reciente al más viejo, con cuántos le
 * faltan por leer.
 *
 * @param {{id: *}} usuario
 * @returns {Promise<{noLeidas: number, notificaciones: object[]}>}
 */
export async function listarMias(usuario) {
  exigirUsuario(usuario);

  // El contador va aparte: la lista corta en 50 y el usuario puede tener más
  // sin leer.
  const [notificaciones, noLeidas] = await Promise.all([
    notificacionRepository.listarDe(usuario.id),
    notificacionRepository.contarNoLeidas(usuario.id),
  ]);
  return { noLeidas, notificaciones };
}

/**
 * Marca un aviso propio como leído.
 *
 * Un aviso de otro usuario responde igual que uno que no existe (404): así no
 * se puede averiguar qué ids existen.
 *
 * @param {*} id
 * @param {{id: *}} usuario
 * @returns {Promise<object>}
 */
export async function marcarLeida(id, usuario) {
  exigirUsuario(usuario);

  const idAviso = Number(id);
  if (!Number.isInteger(idAviso) || idAviso <= 0) {
    throw errorDeNegocio('El id de la notificación no es válido.', 400);
  }

  const aviso = await notificacionRepository.marcarLeida(idAviso, usuario.id);
  if (!aviso) {
    throw errorDeNegocio(`No existe la notificación ${idAviso}.`, 404);
  }

  return aviso;
}
