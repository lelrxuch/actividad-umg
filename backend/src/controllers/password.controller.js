// [EN PROGRESO]
// Controller de recuperación de contraseña
import { solicitarRecuperacion, restablecerContrasena } from '../services/password.service.js';

/** Única respuesta de forgot-password: idéntica exista o no la cuenta. */
export const RESPUESTA_RECUPERACION = Object.freeze({
  message: 'Si el correo existe, se enviará un enlace de recuperación',
});

export async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'El correo es requerido' });

  try {
    // El token nunca viaja en la respuesta (ver password.service).
    await solicitarRecuperacion(email);
    res.json(RESPUESTA_RECUPERACION);
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
}

export async function resetPassword(req, res) {
  const { token, nuevaContrasena } = req.body;

  if (!token || !nuevaContrasena) {
    return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
  }

  // La política de fuerza la valida el service contra password.validator.js,
  // que es la única fuente de verdad. Aquí solo se traduce el error a HTTP.
  try {
    await restablecerContrasena(token, nuevaContrasena);
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}