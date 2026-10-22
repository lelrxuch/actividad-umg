// src/services/documentoService.js
import API from './api';
import { errorDeApi } from './errores';

/** Documentos ya subidos a una solicitud. Siempre devuelve un arreglo. */
export const listarDocumentos = async (solicitudId) => {
  try {
    const respuesta = await API.get(`/documentos/solicitud/${solicitudId}`);
    return respuesta.data?.documentos ?? [];
  } catch (error) {
    throw errorDeApi(error, 'No se pudieron cargar los documentos');
  }
};

/**
 * Sube un documento al expediente.
 *
 * El campo del archivo se llama `archivo`: es el que espera `multer` en el
 * backend. El tamaño (5 MB) y las extensiones (pdf, jpg, png) los valida el
 * backend; el cliente solo los anuncia para que el estudiante no pierda un
 * intento.
 *
 * @param {number|string} solicitudId
 * @param {string} tipo dni, titulo o carta.
 * @param {File} archivo
 */
export const subirDocumento = async (solicitudId, tipo, archivo) => {
  const formulario = new FormData();
  formulario.append('solicitudId', String(solicitudId));
  formulario.append('tipo', tipo);
  formulario.append('archivo', archivo);

  try {
    const respuesta = await API.post('/documentos', formulario);
    return respuesta.data?.documento;
  } catch (error) {
    throw errorDeApi(error, 'No se pudo subir el documento');
  }
};
