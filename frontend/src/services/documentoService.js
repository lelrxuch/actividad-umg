// src/services/documentoService.js
import API from './api';
import { errorDeApi } from './errores';

/**
 * Lista los documentos adjuntos de una solicitud.
 * GET /api/documentos/solicitud/:solicitudId
 */
export const listarDocumentos = async (solicitudId) => {
  try {
    const respuesta = await API.get(`/documentos/solicitud/${solicitudId}`);
    return respuesta.data.documentos || respuesta.data || [];
  } catch (error) {
    throw errorDeApi(error, 'No se pudieron listar los documentos de la solicitud');
  }
};

/**
 * Alias para mantener compatibilidad con la vista de evaluación.
 */
export const listarDocumentosPorSolicitud = listarDocumentos;

/**
 * Sube un archivo adjunto a una solicitud existente.
 * POST /api/documentos
 */
export const subirDocumento = async (solicitudId, tipo, archivo) => {
  try {
    const formData = new FormData();
    formData.append('solicitudId', solicitudId);
    formData.append('tipo', tipo);
    formData.append('archivo', archivo);

    const respuesta = await API.post('/documentos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return respuesta.data.documento !== undefined ? respuesta.data.documento : respuesta.data;
  } catch (error) {
    throw errorDeApi(error, 'No se pudo subir el documento');
  }
};

/**
 * Descarga un documento por su ID solicitando un Blob con cabecera Authorization.
 * GET /api/documentos/:id/descargar
 */
export const descargarDocumento = async (documentoId, nombreArchivo = 'documento.pdf') => {
  try {
    const respuesta = await API.get(`/documentos/${documentoId}/descargar`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([respuesta.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', nombreArchivo);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw errorDeApi(error, 'No se pudo descargar el documento');
  }
};