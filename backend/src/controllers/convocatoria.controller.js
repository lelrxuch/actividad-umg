// Controller del módulo Convocatorias (SCRUM-32, SCRUM-33).
//
// Traduce entre HTTP y convocatoria.service. Ninguna regla de negocio vive acá:
// quién puede gestionar convocatorias, qué transiciones son válidas y qué hace
// falta para publicar están en el service y en las clases de estado.
import * as convocatoriaService from '../services/convocatoria.service.js';

/**
 * Convierte un error de negocio en respuesta HTTP.
 *
 * Un error sin `status` es inesperado y su mensaje no sale al cliente. Cuando
 * trae `faltantes` —publicar una convocatoria incompleta— esa lista sí viaja:
 * es justo lo que el administrador necesita para completarla.
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
 * Quien hace la petición, en la forma que espera el service.
 * El JWT guarda el identificador en `sub`; el dominio lo llama `id`.
 */
function solicitante(req) {
  const token = req.usuario || {};
  return { id: token.sub ?? token.id, rol: token.rol };
}

/**
 * GET /api/convocatorias
 *
 * Público. Sin sesión de administrador devuelve solo las publicadas, que es lo
 * que un estudiante necesita ver antes de registrarse.
 */
export async function listar(req, res) {
  try {
    const usuario = req.usuario ? solicitante(req) : null;
    res.json({ convocatorias: await convocatoriaService.listarConvocatorias(usuario, req.query) });
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * GET /api/convocatorias/:id
 * Público: una convocatoria publicada es información abierta.
 */
export async function obtener(req, res) {
  try {
    res.json(await convocatoriaService.obtenerConvocatoria(Number(req.params.id)));
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * POST /api/convocatorias
 * Solo administrador. Nace en Borrador.
 */
export async function crear(req, res) {
  try {
    const convocatoria = await convocatoriaService.crearConvocatoria(
      req.body || {},
      solicitante(req)
    );
    res.status(201).json({ convocatoria });
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * PATCH /api/convocatorias/:id
 * Solo administrador, y solo mientras sea Borrador.
 */
export async function editar(req, res) {
  try {
    const convocatoria = await convocatoriaService.editarConvocatoria(
      Number(req.params.id),
      req.body || {},
      solicitante(req)
    );
    res.json({ convocatoria });
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * POST /api/convocatorias/:id/publicar
 * Borrador → Publicada. 400 con `faltantes` si está incompleta.
 */
export async function publicar(req, res) {
  try {
    const convocatoria = await convocatoriaService.publicarConvocatoria(
      Number(req.params.id),
      solicitante(req)
    );
    res.json({ convocatoria });
  } catch (error) {
    responderError(res, error);
  }
}

/**
 * POST /api/convocatorias/:id/cerrar
 * Publicada → Cerrada.
 */
export async function cerrar(req, res) {
  try {
    const convocatoria = await convocatoriaService.cerrarConvocatoria(
      Number(req.params.id),
      solicitante(req)
    );
    res.json({ convocatoria });
  } catch (error) {
    responderError(res, error);
  }
}
