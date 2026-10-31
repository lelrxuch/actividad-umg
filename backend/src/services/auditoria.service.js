// Auditoría de operaciones relevantes (requerimiento nuevo R3).
//
// Cada operación auditada llama a `auditar` DENTRO de su transacción
// (config/transaccion.js), así que si el registro falla la operación se
// deshace: no hay cambio sin rastro.
//
// Sin secretos por diseño: cada operación tiene una lista blanca de campos y
// todo lo demás se descarta. Nunca llegan password_hash ni tokens, y el CUI se
// guarda enmascarado.
import * as auditoriaRepository from '../repositories/auditoria.repository.js';

export const OPERACIONES = Object.freeze({
  CAMBIO_ESTADO: 'cambio_estado',
  APROBACION: 'aprobacion',
  CAMBIO_MONTO: 'cambio_monto',
  ASIGNACION_EVALUADOR: 'asignacion_evaluador',
  SUBIDA_DOCUMENTO: 'subida_documento',
  VALIDACION_IDENTIDAD: 'validacion_identidad',
});

/** Qué campos del detalle se guardan, por operación. Lo demás se descarta. */
const CAMPOS_PERMITIDOS = Object.freeze({
  [OPERACIONES.CAMBIO_ESTADO]: ['campo', 'antes', 'despues'],
  [OPERACIONES.APROBACION]: ['etapa', 'resultado'],
  [OPERACIONES.CAMBIO_MONTO]: ['campo', 'antes', 'despues'],
  [OPERACIONES.ASIGNACION_EVALUADOR]: ['evaluadorId', 'evaluadorNombre'],
  [OPERACIONES.SUBIDA_DOCUMENTO]: ['tipo', 'nombreArchivo'],
  [OPERACIONES.VALIDACION_IDENTIDAD]: ['cui', 'resultado'],
});

const LIMITE_MAXIMO = 500;

function errorDeNegocio(mensaje, status) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

/**
 * Deja visibles solo los últimos 4 dígitos: "1234567890101" → "*********0101".
 * @param {*} cui
 * @returns {?string}
 */
export function enmascararCui(cui) {
  if (cui === null || cui === undefined) return null;
  const digitos = String(cui).replace(/\D/g, '');
  if (digitos.length <= 4) return '*'.repeat(digitos.length);
  return '*'.repeat(digitos.length - 4) + digitos.slice(-4);
}

/**
 * Registra una operación. Llamar dentro de la transacción de la operación.
 *
 * @param {string} operacion Una de {@link OPERACIONES}.
 * @param {{usuario: {id: *}, solicitudId?: ?number, detalle?: object}} datos
 * @returns {Promise<object>}
 * @throws {TypeError} Si la operación no existe o falta el usuario: un registro
 *   sin autor no sirve, y fallar aquí deshace la operación.
 */
export async function auditar(operacion, { usuario, solicitudId = null, detalle = {} }) {
  const permitidos = CAMPOS_PERMITIDOS[operacion];
  if (!permitidos) {
    throw new TypeError(`Operación de auditoría desconocida: "${operacion}".`);
  }
  if (usuario?.id === undefined || usuario?.id === null) {
    throw new TypeError('La auditoría requiere el usuario que hizo la operación.');
  }

  const limpio = {};
  for (const campo of permitidos) {
    if (detalle[campo] !== undefined) limpio[campo] = detalle[campo];
  }
  if ('cui' in limpio) limpio.cui = enmascararCui(limpio.cui);

  return auditoriaRepository.registrar({
    usuarioId: usuario.id,
    operacion,
    solicitudId,
    detalle: limpio,
  });
}

/**
 * Consulta de la auditoría. Solo el administrador.
 *
 * @param {{id: *, rol: string}} usuario
 * @param {{solicitudId?: *, limite?: *}} [filtros] Tal como llegan en la query.
 * @returns {Promise<object[]>}
 */
export async function consultar(usuario, { solicitudId, limite } = {}) {
  if (usuario?.rol !== 'administrador') {
    throw errorDeNegocio('Solo un administrador puede consultar la auditoría.', 403);
  }

  let idSolicitud = null;
  if (solicitudId !== undefined && solicitudId !== '') {
    idSolicitud = Number(solicitudId);
    if (!Number.isInteger(idSolicitud) || idSolicitud <= 0) {
      throw errorDeNegocio('"solicitudId" debe ser un id de solicitud.', 400);
    }
  }

  let tope = 200;
  if (limite !== undefined && limite !== '') {
    tope = Number(limite);
    if (!Number.isInteger(tope) || tope <= 0 || tope > LIMITE_MAXIMO) {
      throw errorDeNegocio(`"limite" debe ser un entero entre 1 y ${LIMITE_MAXIMO}.`, 400);
    }
  }

  return auditoriaRepository.listar({ solicitudId: idSolicitud, limite: tope });
}
