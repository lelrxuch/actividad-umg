import { pool } from '../config/db.js';

export async function buscarPorCorreo(correo) {
  const { rows } = await pool.query(
    'SELECT id, correo, contrasena_hash, creado_en FROM usuarios WHERE correo = $1',
    [correo]
  );
  return rows[0] || null;
}

export async function crearUsuario(correo, contrasenaHash) {
  const { rows } = await pool.query(
    'INSERT INTO usuarios (correo, contrasena_hash) VALUES ($1, $2) RETURNING id, correo, creado_en',
    [correo, contrasenaHash]
  );
  return rows[0];
}