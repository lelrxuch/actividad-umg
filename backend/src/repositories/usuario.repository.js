// [EN PROGRESO]
// Acceso a datos de Usuario (necesario para recuperar contraseña)
import { pool } from '../config/db.js';

export async function findByEmail(email) {
  const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  return result.rows[0] || null;
}

export async function saveResetToken(userId, tokenHash, expiraEn) {
  await pool.query(
    'UPDATE usuarios SET reset_token_hash = $1, reset_token_expira = $2, actualizado_en = NOW() WHERE id = $3',
    [tokenHash, expiraEn, userId]
  );
}

export async function findByResetTokenHash(tokenHash) {
  const result = await pool.query('SELECT * FROM usuarios WHERE reset_token_hash = $1', [tokenHash]);
  return result.rows[0] || null;
}

export async function updatePasswordAndClearToken(userId, passwordHash) {
  await pool.query(
    'UPDATE usuarios SET password_hash = $1, reset_token_hash = NULL, reset_token_expira = NULL, actualizado_en = NOW() WHERE id = $2',
    [passwordHash, userId]
  );
}

// ← AGREGA AQUÍ:
export async function actualizarPerfil(id, datos) {
  const { nombre, telefono, correoAlterno } = datos;

  const query = `
    UPDATE usuarios 
    SET nombre = COALESCE($1, nombre),
        telefono = COALESCE($2, telefono),
        correo_alterno = COALESCE($3, correo_alterno),
        actualizado_en = NOW()
    WHERE id = $4
    RETURNING id, nombre, telefono, correo_alterno, email;
  `;

  const resultado = await pool.query(query, [
    nombre || null,
    telefono || null,
    correoAlterno || null,
    id
  ]);

  return resultado.rows[0];
}