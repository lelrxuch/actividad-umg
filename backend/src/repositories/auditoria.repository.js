// Acceso a datos de la auditoría. Solo INSERT y SELECT: no existe función que
// modifique o borre un registro, y aunque existiera, el trigger
// auditoria_sin_cambios de schema.sql la rechazaría.
//
// registrar usa db(): corre dentro de la transacción de la operación auditada.
import { pool } from '../config/db.js';
import { db } from '../config/transaccion.js';

const COLUMNAS = `a.id, a.usuario_id AS "usuarioId", u.nombre AS "usuarioNombre", u.rol AS "usuarioRol",
       a.operacion, a.solicitud_id AS "solicitudId", a.detalle, a.creado_en AS "creadoEn"`;

/**
 * @param {{usuarioId: number, operacion: string, solicitudId: ?number, detalle: object}} registro
 * @returns {Promise<object>}
 */
export async function registrar({ usuarioId, operacion, solicitudId, detalle }) {
  const resultado = await db().query(
    `INSERT INTO auditoria (usuario_id, operacion, solicitud_id, detalle)
     VALUES ($1, $2, $3, $4)
     RETURNING id, creado_en AS "creadoEn"`,
    [usuarioId, operacion, solicitudId, JSON.stringify(detalle)]
  );

  return resultado.rows[0];
}

/**
 * Los registros más recientes primero.
 * @param {{solicitudId?: ?number, limite?: number}} [filtros]
 * @returns {Promise<object[]>}
 */
export async function listar({ solicitudId = null, limite = 200 } = {}) {
  const resultado = await pool.query(
    `SELECT ${COLUMNAS}
       FROM auditoria a JOIN usuarios u ON u.id = a.usuario_id
      WHERE $1::int IS NULL OR a.solicitud_id = $1
      ORDER BY a.id DESC
      LIMIT $2`,
    [solicitudId, limite]
  );

  return resultado.rows;
}
