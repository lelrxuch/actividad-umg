// Acceso a datos de las notificaciones al estudiante.
//
// Solo hay escrituras de una fila a la vez y lecturas filtradas por
// destinatario: un usuario nunca lee los avisos de otro, porque el filtro va en
// la propia consulta y no en el código que la llama.
import { pool } from '../config/db.js';

const COLUMNAS = `id, solicitud_id AS "solicitudId", estado_anterior AS "estadoAnterior",
  estado_nuevo AS "estadoNuevo", canal, mensaje, enviada, error,
  leida_en AS "leidaEn", creado_en AS "creadoEn"`;

/**
 * Registra un aviso. Se llama ANTES de intentar entregarlo, para que el evento
 * quede guardado aunque el canal falle.
 *
 * @param {{solicitudId: number, destinatarioId: number, estadoAnterior: string,
 *   estadoNuevo: string, canal: string, mensaje: string, enviada?: boolean}} aviso
 * @returns {Promise<object>} La fila creada.
 */
export async function registrar({
  solicitudId,
  destinatarioId,
  estadoAnterior,
  estadoNuevo,
  canal,
  mensaje,
  enviada = false,
}) {
  const resultado = await pool.query(
    `INSERT INTO notificaciones
       (solicitud_id, destinatario_id, estado_anterior, estado_nuevo, canal, mensaje, enviada)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLUMNAS}`,
    [solicitudId, destinatarioId, estadoAnterior, estadoNuevo, canal, mensaje, enviada]
  );

  return resultado.rows[0];
}

/**
 * Anota cómo terminó la entrega de un aviso.
 * @param {number} id
 * @param {{enviada: boolean, error?: string}} resultado
 */
export async function marcarResultado(id, { enviada, error = null }) {
  await pool.query(
    `UPDATE notificaciones SET enviada = $2, error = $3 WHERE id = $1`,
    [id, enviada, error]
  );
}

/**
 * Los avisos de un usuario, del más reciente al más viejo.
 * @param {number} destinatarioId
 * @param {number} [limite]
 * @returns {Promise<object[]>}
 */
export async function listarDe(destinatarioId, limite = 50) {
  const resultado = await pool.query(
    `SELECT ${COLUMNAS} FROM notificaciones
      WHERE destinatario_id = $1
      ORDER BY creado_en DESC, id DESC
      LIMIT $2`,
    [destinatarioId, limite]
  );

  return resultado.rows;
}

/**
 * Marca un aviso como leído, solo si es de ese usuario.
 *
 * El dueño va en el WHERE: un aviso ajeno y uno inexistente devuelven lo mismo
 * (`null`), así que nadie puede averiguar qué ids existen.
 *
 * @param {number} id
 * @param {number} destinatarioId
 * @returns {Promise<object|null>} El aviso, o `null` si no existe o no es suyo.
 */
export async function marcarLeida(id, destinatarioId) {
  const resultado = await pool.query(
    `UPDATE notificaciones SET leida_en = COALESCE(leida_en, now())
      WHERE id = $1 AND destinatario_id = $2
      RETURNING ${COLUMNAS}`,
    [id, destinatarioId]
  );

  return resultado.rows[0] || null;
}
