// src/services/convocatoriaService.js
import API from './api';

/**
 * Traduce un error de axios al mensaje que el backend escribio para el usuario.
 *
 * El backend ya distingue entre errores de negocio, cuyo mensaje esta redactado
 * para quien lo lee, y errores inesperados, que responden con un texto
 * genérico. Aqui no se reescribe nada: se toma el mensaje tal como viene.
 */
function mensajeDe(error, respaldo) {
  return new Error(error.response?.data?.error || respaldo);
}

/**
 * Lista las convocatorias visibles para quien pregunta.
 *
 * Sin sesion de administrador el backend devuelve solo las publicadas. El
 * filtrado es suyo: el cliente no decide que puede ver.
 *
 * @returns {Promise<Array>} Las convocatorias, o un arreglo vacio.
 */
export const listarConvocatorias = async () => {
  try {
    const respuesta = await API.get('/convocatorias');
    return respuesta.data?.convocatorias ?? [];
  } catch (error) {
    throw mensajeDe(error, 'No se pudieron cargar las convocatorias');
  }
};

/**
 * Trae una convocatoria por su identificador.
 *
 * @param {number|string} id
 */
export const obtenerConvocatoria = async (id) => {
  try {
    const respuesta = await API.get(`/convocatorias/${id}`);
    return respuesta.data;
  } catch (error) {
    throw mensajeDe(error, 'No se pudo cargar la convocatoria');
  }
};
