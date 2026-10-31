import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

/**
 * SSL para la conexión a PostgreSQL. Azure Database for PostgreSQL lo exige;
 * la base local (Docker) no lo usa. Con DB_SSL=true se verifica el certificado
 * del servidor contra las autoridades que ya trae Node.
 *
 * @param {Record<string, string|undefined>} env
 * @returns {false|{rejectUnauthorized: true}}
 */
export function opcionesSsl(env = process.env) {
  return env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false;
}

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: opcionesSsl(),
});

export async function testConnection() {
  try {
    await pool.query('SELECT NOW()');
    console.log('Conexión a la base de datos exitosa');
  } catch (err) {
    console.error('Error al conectar a la base de datos:', err.message);
  }
}