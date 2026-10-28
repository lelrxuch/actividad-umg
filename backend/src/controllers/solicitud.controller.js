// Controller del módulo Solicitudes (SCRUM-41 y SCRUM-35).
import * as solicitudService from '../services/solicitud.service.js';

/**
 * Convierte un error de negocio en respuesta HTTP.
 *
 * Un error SIN `status` es inesperado, y su mensaje no sale al cliente: los de
 * PostgreSQL traen nombres de tabla y de restricción. Solo los errores de
 * negocio, que llevan status a propósito, hablan con el usuario.
 */
function responderError(res, error) {
  if (!error.status) {
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }

  // `faltantes` y `solicitudExistente` son parte del contrato de error: le
  // dicen al cliente qué documento falta o a qué solicitud ir.
  const cuerpo = { error: error.message };
  if (error.faltantes) cuerpo.faltantes = error.faltantes;
  if (error.solicitudExistente) cuerpo.solicitudExistente = error.solicitudExistente;
  return res.status(error.status).json(cuerpo);
}

/**
 * Quien hace la petición, en la forma que espera la capa de autorización.
 *
 * El JWT guarda el identificador en `sub`; el dominio lo llama `id`. Sin esta
 * traducción el dueño de una solicitud no se reconoce como tal.
 */
function solicitante(req) {
  const token = req.usuario || {};
  return { id: token.sub ?? token.id, rol: token.rol };
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
    const estudianteId = solicitante(req).id;
    const { tipo, convocatoriaId } = req.body || {};

    if (!tipo) {
      return res.status(400).json({ error: 'El tipo de beca es obligatorio.' });
    }

    const nuevaSolicitud = await solicitudService.crearSolicitud(estudianteId, tipo, {
      convocatoriaId: convocatoriaId === undefined ? null : Number(convocatoriaId),
    });
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
    res.json(await solicitudService.listarMisSolicitudes(solicitante(req)));
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * GET /api/solicitudes/asignadas
 * Bandeja de revisión: asignadas al evaluador, o en revisión para el administrador.
 */
export async function listarAsignadas(req, res) {
  try {
    res.json(await solicitudService.listarAsignadas(solicitante(req)));
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
    const solicitud = await solicitudService.obtenerSolicitud(Number(id), solicitante(req));
    res.json(solicitud);
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * POST /api/solicitudes/:id/enviar
 * Transición: Borrador -> Enviada
 * Body: { cui } — se valida contra RENAP en el service (SCRUM-38).
 */
export async function enviar(req, res) {
  try {
    const { id } = req.params;
    const resultado = await solicitudService.enviarSolicitud(Number(id), {
      usuario: solicitante(req),
      cui: req.body?.cui,
    });
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
    const resultado = await solicitudService.evaluarSolicitud(Number(id), {
      usuario: solicitante(req),
    });
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

    const resultado = await solicitudService.dictaminarSolicitud(Number(id), aprobado, {
      usuario: solicitante(req),
    });
    res.json(resultado);
  } catch (error) {
    responderError(res, error);
  }
}