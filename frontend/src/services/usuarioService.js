// src/services/usuarioService.js
import API from './api';
import { errorDeApi } from './errores';

/**
 * Obtiene la lista de evaluadores activa para el Administrador.
 * GET /api/usuarios/evaluadores
 */
export const listarEvaluadores = async () => {
  try {
    const respuesta = await API.get('/usuarios/evaluadores');
    return Array.isArray(respuesta.data) ? respuesta.data : [];
  } catch (error) {
    throw errorDeApi(error, 'No se pudo cargar la lista de evaluadores');
  }
};