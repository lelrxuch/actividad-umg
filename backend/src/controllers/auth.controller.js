// Controller de registro, login y perfil.
//
// Su única responsabilidad es traducir entre HTTP y el service: leer el body,
// llamar al caso de uso y convertir un error de negocio en el código que le
// corresponde. Ninguna regla de validación vive aquí.
import * as authService from '../services/auth.service.js';

/**
 * POST /api/auth/register
 * Body: { nombre, email, password }
 */
export async function registrarUsuario(req, res) {
  try {
    const { nombre, email, password } = req.body || {};
    const resultado = await authService.registrar({ nombre, email, password });
    res.status(201).json(resultado);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ error: error.status ? error.message : 'Error interno del servidor.' });
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function loginUsuario(req, res) {
  try {
    const { email, password } = req.body || {};
    const resultado = await authService.login({ email, password });
    res.json(resultado);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ error: error.status ? error.message : 'Error interno del servidor.' });
  }
}

/**
 * GET /api/auth/perfil
 * Requiere el middleware `autenticado`, que deja el payload del token en
 * req.usuario.
 */
export function perfil(req, res) {
  res.json({ usuario: req.usuario });
}
