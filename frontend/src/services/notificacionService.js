// src/services/notificacionService.js
import API from './api';
import { errorDeApi } from './errores';

/**
 * Los avisos del usuario en sesión, del más reciente al más viejo.
 * GET /api/notificaciones
 *
 * @returns {Promise<{noLeidas: number, notificaciones: object[]}>} Siempre con
 *   las dos claves, aunque el backend responda algo inesperado.
 */
export const listarMisNotificaciones = async () => {
  try {
    const respuesta = await API.get('/notificaciones');
    const datos = respuesta.data || {};
    return {
      noLeidas: Number(datos.noLeidas) || 0,
      notificaciones: Array.isArray(datos.notificaciones) ? datos.notificaciones : [],
    };
  } catch (error) {
    throw errorDeApi(error, 'No se pudieron cargar sus notificaciones');
  }
};

/**
 * Marca un aviso propio como leído.
 * PATCH /api/notificaciones/:id/leida
 *
 * @param {number|string} id
 */
export const marcarNotificacionLeida = async (id) => {
  try {
    const respuesta = await API.patch(`/notificaciones/${id}/leida`);
    return respuesta.data;
  } catch (error) {
    throw errorDeApi(error, 'No se pudo marcar la notificación como leída');
  }
};
