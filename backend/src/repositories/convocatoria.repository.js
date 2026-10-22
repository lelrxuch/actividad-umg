// Acceso a datos de convocatorias (SCRUM-32, SCRUM-33).
//
// Devuelve las filas tal como vienen de PostgreSQL, en snake_case. Traducir a
// objetos de dominio es trabajo del service, igual que en los otros
// repositorios del proyecto.
import { pool } from '../config/db.js';

/**
 * Columnas que se devuelven siempre, para no repetir la lista en cada consulta.
 *
 * Las dos fechas se piden con ::text a proposito. Son columnas DATE, y el driver
 * las convierte a Date de JavaScript interpretandolas en la zona del servidor:
 * '2027-01-01' vuelve como 2027-01-01T06:00:00.000Z y un frontend en otra zona
 * puede mostrar el dia anterior. Una fecha de calendario no tiene hora ni zona,
 * asi que viaja como la cadena 'YYYY-MM-DD' que es.
 */
const COLUMNAS = `id, titulo, descripcion,
                  fecha_apertura::text AS fecha_apertura,
                  fecha_cierre::text   AS fecha_cierre,
                  modalidades, estado, creada_por, creado_en, actualizado_en`;

/**
 * Inserta una convocatoria nueva.
 *
 * El estado no se recibe: toda convocatoria nace en Borrador y eso lo fija el
 * patrón State, no quien llame a esta función.
 *
 * @param {object} datos
 * @param {string} datos.titulo
 * @param {string|null} datos.descripcion
 * @param {string|null} datos.fechaApertura
 * @param {string|null} datos.fechaCierre
 * @param {string[]} datos.modalidades
 * @param {string} datos.estado Nombre del estado inicial.
 * @param {number|null} datos.creadaPor
 * @returns {Promise<object>} La fila creada.
 */
export async function crear({
  titulo,
  descripcion,
  fechaApertura,
  fechaCierre,
  modalidades,
  estado,
  creadaPor,
}) {
  const resultado = await pool.query(
    `INSERT INTO convocatorias
       (titulo, descripcion, fecha_apertura, fecha_cierre, modalidades, estado, creada_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLUMNAS}`,
    [titulo, descripcion, fechaApertura, fechaCierre, modalidades, estado, creadaPor]
  );

  return resultado.rows[0];
}

/**
 * Busca una convocatoria por su identificador.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
export async function findById(id) {
  const resultado = await pool.query(
    `SELECT ${COLUMNAS} FROM convocatorias WHERE id = $1`,
    [id]
  );

  return resultado.rows[0] || null;
}

/**
 * Lista convocatorias, opcionalmente filtrando por estado.
 *
 * Las más recientes primero: una convocatoria vieja rara vez es la que se
 * busca.
 *
 * @param {{estado?: string}} [filtro]
 * @returns {Promise<object[]>}
 */
export async function listar({ estado } = {}) {
  if (estado) {
    const resultado = await pool.query(
      `SELECT ${COLUMNAS} FROM convocatorias WHERE estado = $1 ORDER BY creado_en DESC`,
      [estado]
    );
    return resultado.rows;
  }

  const resultado = await pool.query(
    `SELECT ${COLUMNAS} FROM convocatorias ORDER BY creado_en DESC`
  );
  return resultado.rows;
}

/**
 * Persiste el estado resultante de una transición.
 *
 * Solo el estado: las transiciones no cambian ningún otro dato, y una
 * actualización amplia acá permitiría colar cambios de fechas o modalidades en
 * una convocatoria ya publicada.
 *
 * @param {number} id
 * @param {string} estado
 * @returns {Promise<object|null>}
 */
export async function actualizarEstado(id, estado) {
  const resultado = await pool.query(
    `UPDATE convocatorias
        SET estado = $2, actualizado_en = NOW()
      WHERE id = $1
      RETURNING ${COLUMNAS}`,
    [id, estado]
  );

  return resultado.rows[0] || null;
}

/**
 * Actualiza los datos editables de una convocatoria.
 *
 * No toca `estado`: cambiarlo es una transición y va por {@link actualizarEstado}.
 *
 * @param {number} id
 * @param {object} datos
 * @returns {Promise<object|null>}
 */
export async function actualizarDatos(
  id,
  { titulo, descripcion, fechaApertura, fechaCierre, modalidades }
) {
  const resultado = await pool.query(
    `UPDATE convocatorias
        SET titulo = $2,
            descripcion = $3,
            fecha_apertura = $4,
            fecha_cierre = $5,
            modalidades = $6,
            actualizado_en = NOW()
      WHERE id = $1
      RETURNING ${COLUMNAS}`,
    [id, titulo, descripcion, fechaApertura, fechaCierre, modalidades]
  );

  return resultado.rows[0] || null;
}

/**
 * Cuántas solicitudes cuelgan de una convocatoria.
 *
 * Sirve para informar al administrador antes de cerrarla, y para que la
 * pantalla muestre el avance.
 *
 * @param {number} id
 * @returns {Promise<number>}
 */
export async function contarSolicitudes(id) {
  const resultado = await pool.query(
    'SELECT COUNT(*)::int AS total FROM solicitudes WHERE convocatoria_id = $1',
    [id]
  );

  return resultado.rows[0].total;
}
