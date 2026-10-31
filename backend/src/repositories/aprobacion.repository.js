// Acceso a datos de las aprobaciones de una solicitud: quién decidió cada
// etapa, cuándo y con qué resultado.
//
// Las escrituras usan db(): se hacen dentro de la misma transacción que el
// cambio de estado, para que no exista una aprobación sin su estado ni al
// revés.
import { pool } from '../config/db.js';
import { db } from '../config/transaccion.js';

/** Etapas de la aprobación de una solicitud. */
export const ETAPAS = Object.freeze({ EVALUACION: 'evaluacion', AUTORIZACION: 'autorizacion' });

/**
 * Registra la decisión de una etapa.
 * @param {{solicitudId: number, usuarioId: number, etapa: string, aprobado: boolean}} decision
 * @returns {Promise<object>}
 */
export async function registrar({ solicitudId, usuarioId, etapa, aprobado }) {
  const resultado = await db().query(
    `INSERT INTO aprobaciones (solicitud_id, usuario_id, etapa, resultado)
     VALUES ($1, $2, $3, $4)
     RETURNING id, solicitud_id AS "solicitudId", usuario_id AS "usuarioId",
               etapa, resultado, creado_en AS "creadoEn"`,
    [solicitudId, usuarioId, etapa, aprobado ? 'aprobada' : 'rechazada']
  );

  return resultado.rows[0];
}

/**
 * Las decisiones registradas sobre una solicitud, en orden, con el nombre de
 * quien decidió.
 * @param {number} solicitudId
 * @returns {Promise<Array<{usuarioId: number, nombre: string, etapa: string,
 *   resultado: string, creadoEn: Date}>>}
 */
export async function listarDeSolicitud(solicitudId) {
  const resultado = await pool.query(
    `SELECT a.usuario_id AS "usuarioId", u.nombre, a.etapa, a.resultado,
            a.creado_en AS "creadoEn"
       FROM aprobaciones a
       JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.solicitud_id = $1
      ORDER BY a.creado_en ASC, a.id ASC`,
    [solicitudId]
  );

  return resultado.rows;
}
