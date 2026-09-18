// [EN PROGRESO]
// Lógica de recuperación de contraseña (generar/validar token, cambiar hash)
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  findByEmail,
  saveResetToken,
  findByResetTokenHash,
  updatePasswordAndClearToken,
} from '../repositories/usuario.repository.js';
import { validarContrasena } from '../validators/password.validator.js';

const MINUTOS_EXPIRACION = Number(process.env.RESET_TOKEN_EXPIRES_MIN || 30);

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function solicitarRecuperacion(email) {
  const usuario = await findByEmail(email);

  // Respuesta idéntica exista o no el usuario, para no filtrar qué correos están registrados
  if (!usuario) return;

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiraEn = new Date(Date.now() + MINUTOS_EXPIRACION * 60 * 1000);

  await saveResetToken(usuario.id, tokenHash, expiraEn);

  // TEMPORAL: aquí iría el envío real del correo. Por ahora lo dejamos en consola para pruebas.
  console.log(`Token de recuperación para ${email}: ${token}`);

  return token; // solo se usa para pruebas locales, no debería exponerse en producción
}

/**
 * Restablece la contraseña de un usuario a partir de un token de recuperación.
 *
 * La política de fuerza se valida antes de tocar la base de datos: es una
 * comprobación de entrada pura, evita una consulta inútil y, de paso, no le
 * confirma a quien prueba tokens al azar si el token era válido o no.
 *
 * @param {string} token Token de recuperación en claro, tal como llegó en el enlace.
 * @param {string} nuevaContrasena Contraseña nueva en texto plano.
 * @throws {Error & { status?: number }} Si la contraseña no cumple la política,
 *   si el token no existe o si ya expiró.
 */
export async function restablecerContrasena(token, nuevaContrasena) {
  validarContrasena(nuevaContrasena);

  const tokenHash = hashToken(token);
  const usuario = await findByResetTokenHash(tokenHash);

  if (!usuario) throw new Error('Token inválido');
  if (new Date(usuario.reset_token_expira) < new Date()) throw new Error('Token expirado');

  const nuevoHash = await bcrypt.hash(nuevaContrasena, 10);
  await updatePasswordAndClearToken(usuario.id, nuevoHash);
}