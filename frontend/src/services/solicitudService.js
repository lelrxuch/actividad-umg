// src/services/solicitudService.js
import API from './api';
import { errorDeApi } from './errores';

/**
 * Crea una solicitud en Borrador.
 *
 * @param {{tipo: string, convocatoriaId?: number}} datos
 * @returns {Promise<object>} La solicitud, con sus documentos requeridos.
 * @throws 409 con `solicitudExistente` si ya tiene una en esa convocatoria.
 */
export const crearSolicitud = async ({ tipo, convocatoriaId }) => {
  try {
    const respuesta = await API.post('/solicitudes', { tipo, convocatoriaId });
    return respuesta.data;
  } catch (error) {
    throw errorDeApi(error, 'No se pudo crear la solicitud');
  }
};

/** Las solicitudes del usuario con sesión. Siempre devuelve un arreglo. */
export const listarMisSolicitudes = async () => {
  try {
    const respuesta = await API.get('/solicitudes');
    return Array.isArray(respuesta.data) ? respuesta.data : [];
  } catch (error) {
    throw errorDeApi(error, 'No se pudieron cargar sus solicitudes');
  }
};

/** Una solicitud, con su estado y las acciones que ese estado admite. */
export const obtenerSolicitud = async (id) => {
  try {
    const respuesta = await API.get(`/solicitudes/${id}`);
    return respuesta.data;
  } catch (error) {
    throw errorDeApi(error, 'No se pudo cargar la solicitud');
  }
};

/**
 * Envía la solicitud a evaluación.
 *
 * @param {number|string} id
 * @param {string} cui CUI del estudiante; el backend lo valida contra RENAP.
 * @throws 400 con `faltantes` si el expediente está incompleto.
 * @throws 400 si el CUI no existe o no corresponde al nombre de la cuenta.
 * @throws 503 si RENAP no respondió; se puede reintentar.
 */
export const enviarSolicitud = async (id, cui) => {
  try {
    const respuesta = await API.post(`/solicitudes/${id}/enviar`, { cui });
    return respuesta.data;
  } catch (error) {
    throw errorDeApi(error, 'No se pudo enviar la solicitud');
  }
};
