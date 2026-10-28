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

/**
 * Genera y guarda un token de recuperación si el correo está registrado.
 *
 * NO devuelve el token, exista o no la cuenta. Antes lo devolvía y el
 * controller lo ponía en la respuesta (`tokenDebug`) siempre que NODE_ENV no
 * fuera 'production', que es el valor por defecto: cualquiera podía cambiar la
 * contraseña de cualquier cuenta conociendo solo el correo, y como el token
 * solo aparecía si la cuenta existía, además revelaba qué correos están
 * registrados. Si no sale de esta función, ninguna capa de arriba lo puede
 * filtrar.
 *
 * Mientras no haya envío de correo, el token se muestra en la consola del
 * servidor para probar en local, nunca en producción: los logs también se leen.
 *
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function solicitarRecuperacion(email) {
  const usuario = await findByEmail(email);

  if (!usuario) return;

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiraEn = new Date(Date.now() + MINUTOS_EXPIRACION * 60 * 1000);

  await saveResetToken(usuario.id, tokenHash, expiraEn);

  // TEMPORAL: aquí iría el envío real del correo.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Token de recuperación para ${email}: ${token}`);
  }
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