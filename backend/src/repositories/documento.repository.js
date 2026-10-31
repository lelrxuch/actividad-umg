// Acceso a datos de Documento.
//
// PENDIENTE DE INFRAESTRUCTURA: la tabla `documentos` todavía no existe en el
// schema del proyecto, igual que `solicitudes` cuando se escribió su
// repositorio. Las consultas de abajo son las definitivas; quedan operativas en
// cuanto se creen las tablas `documentos` (id, solicitud_id, estudiante_id,
// tipo, nombre_archivo, ruta_archivo, creado_en) y `solicitud_evaluadores`
// (solicitud_id, evaluador_id).
import { pool } from '../config/db.js';
import { db } from '../config/transaccion.js';

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

/**
 * Inserta un documento del expediente.
 *
 * `estudiante_id` es NOT NULL y se guarda aunque sea derivable de la solicitud:
 * es la columna que lee el Proxy para reconocer al dueño, y una consulta menos
 * en cada descarga.
 *
 * @param {object} datos
 * @param {number} datos.solicitudId
 * @param {number} datos.estudianteId
 * @param {string} datos.tipo
 * @param {string} datos.nombreArchivo Nombre que el usuario verá.
 * @param {string} datos.rutaArchivo Ruta relativa dentro del directorio de subidas.
 * @returns {Promise<object>} La fila creada, en camelCase.
 */
export async function crear({ solicitudId, estudianteId, tipo, nombreArchivo, rutaArchivo }) {
  // db(): se crea dentro de la transacción que también lo audita.
  const resultado = await db().query(
    `INSERT INTO documentos (solicitud_id, estudiante_id, tipo, nombre_archivo, ruta_archivo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id,
               solicitud_id   AS "solicitudId",
               estudiante_id  AS "estudianteId",
               tipo,
               nombre_archivo AS "nombreArchivo",
               ruta_archivo   AS "rutaArchivo",
               creado_en      AS "creadoEn"`,
    [solicitudId, estudianteId, tipo, nombreArchivo, rutaArchivo]
  );

  return resultado.rows[0];
}

/**
 * Documentos ya cargados en una solicitud.
 *
 * Sirve para dos cosas: decirle al estudiante qué lleva subido, y detectar un
 * tipo repetido antes de escribir el archivo en disco. El índice único
 * (solicitud_id, tipo) es la garantía real contra el duplicado; esto evita
 * dejar un archivo huérfano cuando el conflicto es previsible.
 *
 * @param {number} solicitudId
 * @returns {Promise<Array<{id: number, tipo: string, nombreArchivo: string}>>}
 */
export async function listarDeSolicitud(solicitudId) {
  const resultado = await pool.query(
    `SELECT id, tipo, nombre_archivo AS "nombreArchivo", creado_en AS "creadoEn"
       FROM documentos
      WHERE solicitud_id = $1
      ORDER BY tipo`,
    [solicitudId]
  );

  return resultado.rows;
}
