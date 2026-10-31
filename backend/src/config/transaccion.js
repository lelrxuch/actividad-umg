// Transacciones de base de datos.
//
// Hasta la doble aprobación cada operación escribía una sola fila y no hacía
// falta. Ahora un dictamen escribe el estado nuevo y la aprobación, y tienen
// que guardarse las dos o ninguna: una aprobación registrada para un estado
// que no se guardó (o al revés) es exactamente el rastro falso que la
// auditoría tiene que evitar.
//
// Los repositorios no reciben la conexión como parámetro: piden `db()`, que
// dentro de `conTransaccion` devuelve la conexión de la transacción y fuera de
// ella el pool de siempre. Así una consulta que no participa de una
// transacción funciona exactamente igual que antes.
import { AsyncLocalStorage } from 'node:async_hooks';
import { pool } from './db.js';

const transaccionEnCurso = new AsyncLocalStorage();

/**
 * Dónde ejecutar una consulta: la transacción en curso, si hay una; si no, el
 * pool.
 * @returns {{query: Function}}
 */
export function db() {
  return transaccionEnCurso.getStore() ?? pool;
}

/**
 * Ejecuta `trabajo` dentro de BEGIN/COMMIT con una sola conexión. Si algo
 * lanza, ROLLBACK y el error sigue su camino.
 *
 * @template T
 * @param {() => Promise<T>} trabajo
 * @returns {Promise<T>}
 */
export async function conTransaccion(trabajo) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await transaccionEnCurso.run(cliente, trabajo);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    cliente.release();
  }
}
