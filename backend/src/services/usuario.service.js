import * as usuarioRepository from '../repositories/usuario.repository.js';

export async function actualizarPerfil(id, datos) {
  const usuarioActualizado = await usuarioRepository.actualizarPerfil(id, datos);
  return usuarioActualizado;
}