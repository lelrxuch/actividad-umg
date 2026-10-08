// Acceso a datos de Documento.
//
// PENDIENTE DE INFRAESTRUCTURA: la tabla `documentos` todavía no existe en el
// schema del proyecto, igual que `solicitudes` cuando se escribió su
// repositorio. Las consultas de abajo son las definitivas; quedan operativas en
// cuanto se creen las tablas `documentos` (id, solicitud_id, estudiante_id,
// tipo, nombre_archivo, ruta_archivo, creado_en) y `solicitud_evaluadores`
// (solicitud_id, evaluador_id).
import { pool } from '../config/db.js';

/**
 * Metadatos de un documento, sin su contenido.
 *
 * Devuelve las claves en camelCase porque es lo que consumen el proxy y el
 * documento real; la traducción de nombres de columna se hace aquí, que es la
 * frontera con la base de datos.
 *
 * @param {number} id
 * @returns {Promise<{id: number, solicitudId: number, estudianteId: number,
 *   tipo: string, nombreArchivo: string, rutaArchivo: string}|null>}
 */
export async function findById(id) {
  const resultado = await pool.query(
    `SELECT id,
            solicitud_id   AS "solicitudId",
            estudiante_id  AS "estudianteId",
            tipo,
            nombre_archivo AS "nombreArchivo",
            ruta_archivo   AS "rutaArchivo"
       FROM documentos
      WHERE id = $1`,
    [id]
  );

  return resultado.rows[0] || null;
}

/**
 * Ids de los evaluadores asignados a una solicitud.
 * @param {number} solicitudId
 * @returns {Promise<number[]>}
 */
export async function evaluadoresDeSolicitud(solicitudId) {
  const resultado = await pool.query(
    'SELECT evaluador_id FROM solicitud_evaluadores WHERE solicitud_id = $1',
    [solicitudId]
  );

  return resultado.rows.map((fila) => fila.evaluador_id);
}
