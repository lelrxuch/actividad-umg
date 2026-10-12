// Controller del módulo Expedientes (SCRUM-43).
//
// Traduce entre HTTP y expediente.service. La regla de qué documentos exige
// cada modalidad no está aquí ni puede estarlo: sale del ExpedienteBuilder y
// del tipo de beca que entrega el Factory Method. Este archivo solo decide qué
// código HTTP corresponde a cada resultado.
import * as expedienteService from '../services/expediente.service.js';

/**
 * Convierte un error de negocio en respuesta HTTP.
 *
 * ExpedienteIncompletoError trae `faltantes`, y esa lista es justamente lo que
 * el estudiante necesita para saber qué papel le falta subir: se incluye en el
 * cuerpo en vez de perderse en un mensaje de texto.
 */
function responderError(res, error) {
  if (error.faltantes) {
    return res.status(error.status || 400).json({
      error: error.message,
      faltantes: error.faltantes,
    });
  }

  return res
    .status(error.status || 500)
    .json({ error: error.status ? error.message : 'Error interno del servidor.' });
}

/**
 * POST /api/expedientes/revision
 * Body: { tipo, documentos }
 *
 * Responde siempre 200 con el progreso. No lanza si falta algo: su razón de
 * ser es que el frontend muestre la lista de pendientes mientras el estudiante
 * sube papeles, y para eso un error sería ruido.
 */
export function revisarExpediente(req, res) {
  try {
    const { tipo, documentos } = req.body || {};
    res.json(expedienteService.revisarExpediente(tipo, documentos));
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * POST /api/expedientes
 * Body: { tipo, documentos }
 *
 * Cierra el expediente. 201 con el expediente inmutable si está completo;
 * 400 con la lista de faltantes si no.
 */
export function armarExpediente(req, res) {
  try {
    const { tipo, documentos } = req.body || {};
    res.status(201).json({ expediente: expedienteService.armarExpediente(tipo, documentos) });
  } catch (error) {
    responderError(res, error);
  }
}
