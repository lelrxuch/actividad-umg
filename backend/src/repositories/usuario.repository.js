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