// src/services/auditoriaService.js
import API from './api';
import { errorDeApi } from './errores';

/**
 * Registros de auditoría, del más reciente al más viejo. Solo administrador:
 * el backend responde 403 a cualquier otro rol.
 * GET /api/auditoria?solicitudId=
 *
 * @param {{solicitudId?: number|string}} [filtros]
 * @returns {Promise<object[]>} Siempre un arreglo.
 */
export const listarAuditoria = async ({ solicitudId } = {}) => {
  try {
    const params = solicitudId ? { solicitudId } : undefined;
    const respuesta = await API.get('/auditoria', params ? { params } : undefined);
    return Array.isArray(respuesta.data) ? respuesta.data : [];
  } catch (error) {
    throw errorDeApi(error, 'No se pudo cargar la auditoría');
  }
};
