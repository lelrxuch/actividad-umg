// [EN PROGRESO]
// Controller de recuperación de contraseña
import { solicitarRecuperacion, restablecerContrasena } from '../services/password.service.js';

export async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'El correo es requerido' });

  try {
    const token = await solicitarRecuperacion(email);
    const respuesta = { message: 'Si el correo existe, se enviará un enlace de recuperación' };
    if (token && process.env.NODE_ENV !== 'production') respuesta.tokenDebug = token; // TEMPORAL: solo para pruebas locales
    res.json(respuesta);
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
}

export async function resetPassword(req, res) {
  const { token, nuevaContrasena } = req.body;

  if (!token || !nuevaContrasena) {
    return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
  }

  if (nuevaContrasena.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    await restablecerContrasena(token, nuevaContrasena);
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}