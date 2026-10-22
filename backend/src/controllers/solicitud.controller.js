// Controller del módulo Solicitudes (SCRUM-41 y SCRUM-35).
import * as solicitudService from '../services/solicitud.service.js';
import * as solicitudRepository from '../repositories/solicitud.repository.js';

/** Convierte un error de negocio en respuesta HTTP. */
function responderError(res, error) {
  const status = error.status || 500;
  return res
    .status(status)
    .json({ error: error.message || 'Error interno del servidor.' });
}

/**
 * GET /api/solicitudes/tipos
 */
export function listarTipos(req, res) {
  try {
    res.json({ tipos: solicitudService.tiposDeBeca() });
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * GET /api/solicitudes/tipos/:tipo/documentos
 */
export function listarDocumentos(req, res) {
  try {
    const { tipo } = req.params;
    res.json({ tipo, documentos: solicitudService.documentosRequeridos(tipo) });
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * POST /api/solicitudes
 * Estudiante crea solicitud en estado Borrador.
 */
export async function crear(req, res) {
  try {
    const estudianteId = req.usuario.sub; // sub del token JWT
    const { tipo } = req.body;

    if (!tipo) {
      return res.status(400).json({ error: 'El tipo de beca es obligatorio.' });
    }

    const nuevaSolicitud = await solicitudService.crearSolicitud(estudianteId, tipo);
    res.status(201).json(nuevaSolicitud);
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * GET /api/solicitudes
 * Estudiante lista sus propias solicitudes.
 */
export async function listarMisSolicitudes(req, res) {
  try {
    const estudianteId = req.usuario.sub;
    const solicitudes = await solicitudRepository.listarPorEstudiante(estudianteId);
    res.json(solicitudes);
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * GET /api/solicitudes/:id
 * Consulta el estado y acciones válidas de una solicitud.
 */
export async function obtenerPorId(req, res) {
  try {
    const { id } = req.params;
    const solicitud = await solicitudService.obtenerSolicitud(Number(id));
    res.json(solicitud);
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * POST /api/solicitudes/:id/enviar
 * Transición: Borrador -> Enviada
 */
export async function enviar(req, res) {
  try {
    const { id } = req.params;
    const resultado = await solicitudService.enviarSolicitud(Number(id));
    res.json(resultado);
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * POST /api/solicitudes/:id/evaluar
 * Transición: Enviada -> En Evaluación
 */
export async function evaluar(req, res) {
  try {
    const { id } = req.params;
    const resultado = await solicitudService.evaluarSolicitud(Number(id));
    res.json(resultado);
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * POST /api/solicitudes/:id/dictamen
 * Transición: En Evaluación -> Aprobada o Rechazada
 */
export async function dictaminar(req, res) {
  try {
    const { id } = req.params;
    const { aprobado } = req.body;

    if (typeof aprobado !== 'boolean') {
      return res.status(400).json({ error: 'El campo "aprobado" es requerido y debe ser booleano.' });
    }

    const resultado = await solicitudService.dictaminarSolicitud(Number(id), aprobado);
    res.json(resultado);
  } catch (error) {
    responderError(res, error);
  }
}