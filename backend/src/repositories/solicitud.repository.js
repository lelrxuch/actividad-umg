// Acceso a datos de Solicitud.
//
// PENDIENTE DE INFRAESTRUCTURA: la tabla `solicitudes` todavía no existe en el
// schema del proyecto (ver SCRUM-24, que está definiendo dónde vive el DDL).
// Las consultas de abajo son las definitivas; quedan operativas en cuanto se
// cree la tabla con las columnas: id, estudiante_id, estado, creado_en,
// actualizado_en.
import { pool } from '../config/db.js';

/**
 * Busca una solicitud por su identificador.
 * @param {number} id
 * @returns {Promise<{id: number, estudiante_id: number, estado: string}|null>}
 */
export async function findById(id) {
  const resultado = await pool.query(
    'SELECT id, estudiante_id, estado, creado_en, actualizado_en FROM solicitudes WHERE id = $1',
    [id]
  );

  return resultado.rows[0] || null;
}

/**
 * Crea una solicitud con su estado inicial.
 * @param {number} estudianteId
 * @param {string} estado Nombre del estado inicial.
 */
export async function crear(estudianteId, estado) {
  const resultado = await pool.query(
    `INSERT INTO solicitudes (estudiante_id, estado)
     VALUES ($1, $2)
     RETURNING id, estudiante_id, estado, creado_en`,
    [estudianteId, estado]
  );

  return resultado.rows[0];
}

/**
 * Persiste el nuevo estado de una solicitud tras una transición válida.
 * @param {number} id
 * @param {string} estado Nombre del estado resultante.
 */
export async function actualizarEstado(id, estado) {
  const resultado = await pool.query(
    `UPDATE solicitudes
     SET estado = $1, actualizado_en = NOW()
     WHERE id = $2
     RETURNING id, estudiante_id, estado, actualizado_en`,
    [estado, id]
  );

  return resultado.rows[0] || null;
}
