// Acceso a datos de Solicitud.
//
//
// Todas las lecturas devuelven las mismas columnas (COLUMNAS). Antes cada
// consulta elegía las suyas, y el listado no traía `tipo` ni
// `convocatoria_id`: la pantalla no podía saber qué documentos pedir.
import { pool } from '../config/db.js';
import { db } from '../config/transaccion.js';

const COLUMNAS = 'id, estudiante_id, estado, tipo, convocatoria_id, monto_solicitado, creado_en, actualizado_en';

/**
 * Busca una solicitud por su identificador.
 *
 * `tipo` se incluye desde SCRUM-42: es la modalidad de beca y es lo que decide
 * qué documentos admite el expediente. Mientras no se seleccionaba, la
 * validación de tipo de documento recibía `undefined` y dejaba pasar cualquier
 * papel, aunque las pruebas que la mockeaban dieran verde.
 *
 * @param {number} id
 * @returns {Promise<{id: number, estudiante_id: number, estado: string,
 *   tipo: string|null}|null>}
 */
export async function findById(id) {
  const resultado = await pool.query(
    `SELECT ${COLUMNAS} FROM solicitudes WHERE id = $1`,
    [id]
  );

  return resultado.rows[0] || null;
}

/**
 * Crea una solicitud con su estado inicial.
 * @param {number} estudianteId
 * @param {string} estado Nombre del estado inicial.
 */
export async function crear(estudianteId, estado, { tipo = null, convocatoriaId = null } = {}) {
  const resultado = await pool.query(
    `INSERT INTO solicitudes (estudiante_id, estado, tipo, convocatoria_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, estudiante_id, estado, tipo, convocatoria_id, creado_en`,
    [estudianteId, estado, tipo, convocatoriaId]
  );

  return resultado.rows[0];
}

/**
 * Persiste el nuevo estado de una solicitud tras una transición válida.
 *
 * `cui` se registra en el mismo UPDATE que el estado (SCRUM-38): así no puede
 * quedar una solicitud Enviada sin el CUI con que se envió. Si no viene, se
 * conserva el que hubiera.
 *
 * @param {number} id
 * @param {string} estado Nombre del estado resultante.
 * @param {{cui?: string}} [registro] Datos validados que acompañan la transición.
 */
export async function actualizarEstado(id, estado, { cui = null } = {}) {
  // db(): dentro de una transacción, su conexión; fuera, el pool.
  const resultado = await db().query(
    `UPDATE solicitudes
     SET estado = $1, cui = COALESCE($3, cui), actualizado_en = NOW()
     WHERE id = $2
     RETURNING id, estudiante_id, estado, actualizado_en`,
    [estado, id, cui]
  );

  return resultado.rows[0] || null;
}


/**
 * Lista las solicitudes pertenecientes a un estudiante.
 * @param {number} estudianteId
 * @returns {Promise<Array<object>>} Filas con las columnas de COLUMNAS.
 */
export async function listarPorEstudiante(estudianteId) {
  const resultado = await pool.query(
    `SELECT ${COLUMNAS} FROM solicitudes WHERE estudiante_id = $1 ORDER BY creado_en DESC`,
    [estudianteId]
  );

  return resultado.rows;
}
/**
 * Las solicitudes asignadas a un evaluador en solicitud_evaluadores, en
 * cualquier estado, de la más vieja a la más nueva.
 *
 * Las columnas de solicitud_evaluadores (solicitud_id, evaluador_id) no
 * chocan con las de COLUMNAS, así que se pueden seleccionar sin prefijo.
 *
 * @param {number} evaluadorId
 * @returns {Promise<Array<object>>} Filas con las columnas de COLUMNAS.
 */
export async function listarAsignadasA(evaluadorId) {
  const resultado = await pool.query(
    `SELECT ${COLUMNAS} FROM solicitudes
       JOIN solicitud_evaluadores ON solicitud_id = id
      WHERE evaluador_id = $1
      ORDER BY creado_en ASC, id ASC`,
    [evaluadorId]
  );

  return resultado.rows;
}

/**
 * Asigna un evaluador a una solicitud.
 *
 * ON CONFLICT DO NOTHING sobre la llave primaria (solicitud_id, evaluador_id):
 * si ya estaba asignado no se inserta nada y RETURNING no trae filas. Así el
 * "ya asignado" se decide en la misma sentencia, sin una consulta previa que
 * dos peticiones simultáneas podrían pasar las dos.
 *
 * @param {number} solicitudId
 * @param {number} evaluadorId
 * @returns {Promise<boolean>} true si se asignó, false si ya lo estaba.
 */
export async function asignarEvaluador(solicitudId, evaluadorId) {
  const resultado = await db().query(
    `INSERT INTO solicitud_evaluadores (solicitud_id, evaluador_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING
     RETURNING solicitud_id`,
    [solicitudId, evaluadorId]
  );

  return resultado.rowCount > 0;
}

/**
 * Todas las solicitudes que esperan revisión (Enviada o En Evaluación), de la
 * más vieja a la más nueva. Es la bandeja del administrador.
 * @returns {Promise<Array<object>>} Filas con las columnas de COLUMNAS.
 */
export async function listarEnRevision() {
  const resultado = await pool.query(
    `SELECT ${COLUMNAS} FROM solicitudes
      WHERE estado IN ('Enviada', 'En Evaluación', 'Pendiente de Autorización')
      ORDER BY creado_en ASC, id ASC`
  );

  return resultado.rows;
}

/**
 * Las solicitudes en un estado dado, de la más vieja a la más nueva. Es la
 * bandeja de la autoridad autorizadora: las que esperan su decisión.
 * @param {string} estado
 * @returns {Promise<Array<object>>} Filas con las columnas de COLUMNAS.
 */
export async function listarEnEstado(estado) {
  const resultado = await pool.query(
    `SELECT ${COLUMNAS} FROM solicitudes
      WHERE estado = $1
      ORDER BY creado_en ASC, id ASC`,
    [estado]
  );

  return resultado.rows;
}

/**
 * Cambia el monto solicitado. Que la solicitud siga en Borrador lo comprueba
 * el service antes de llamar.
 * @param {number} id
 * @param {number} monto
 * @returns {Promise<object|null>} La fila actualizada.
 */
export async function actualizarMonto(id, monto) {
  const resultado = await db().query(
    `UPDATE solicitudes SET monto_solicitado = $2, actualizado_en = NOW()
      WHERE id = $1
      RETURNING ${COLUMNAS}`,
    [id, monto]
  );

  return resultado.rows[0] || null;
}

/**
 * ¿Tiene ya el estudiante una solicitud vigente en esta convocatoria?
 *
 * "Vigente" es cualquier estado salvo Rechazada: una solicitud en curso o ya
 * aprobada impide abrir otra, una rechazada no.
 *
 * @param {number} estudianteId
 * @param {number} convocatoriaId
 * @returns {Promise<number|null>} El id de la que ya existe, o null.
 */
export async function vigenteEnConvocatoria(estudianteId, convocatoriaId) {
  const resultado = await pool.query(
    `SELECT id FROM solicitudes
      WHERE estudiante_id = $1 AND convocatoria_id = $2 AND estado <> 'Rechazada'
      ORDER BY creado_en DESC
      LIMIT 1`,
    [estudianteId, convocatoriaId]
  );

  return resultado.rows[0]?.id ?? null;
}
