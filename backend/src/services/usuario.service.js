import * as usuarioRepository from '../repositories/usuario.repository.js';
import { exigirAdministrador } from './solicitud.autorizacion.js';

/**
 * Los evaluadores que el administrador puede asignar a una solicitud
 * (POST /api/solicitudes/:id/evaluadores), ordenados por nombre.
 *
 * Se arma cada objeto con sus tres campos aunque el repositorio ya los limite:
 * si alguien cambia la consulta, password_hash sigue sin salir.
 *
 * @param {{id: *, rol: string}} usuario Quien pregunta.
 * @returns {Promise<Array<{id: number, nombre: string, email: string}>>}
 * @throws {Error & { status: number }} 403 si no es administrador.
 */
export async function listarEvaluadores(usuario) {
  exigirAdministrador(usuario, 'Solo un administrador puede ver la lista de evaluadores.');

  const filas = await usuarioRepository.listarPorRol('evaluador');
  return filas.map(({ id, nombre, email }) => ({ id, nombre, email }));
}

export async function actualizarPerfil(id, datos) {
  const usuarioActualizado = await usuarioRepository.actualizarPerfil(id, datos);
  return usuarioActualizado;
}