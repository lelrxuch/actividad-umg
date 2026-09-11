import { registrar, login } from '../services/authService.js';

export async function registrarUsuario(req, res) {
  try {
    const { correo, contrasena } = req.body;
    const resultado = await registrar({ correo, contrasena });
    res.status(201).json(resultado);
  } catch (err) {
    res.status(err.status || 500).json({ mensaje: err.message || 'Error interno del servidor.' });
  }
}

export async function loginUsuario(req, res) {
  try {
    const { correo, contrasena } = req.body;
    const resultado = await login({ correo, contrasena });
    res.json(resultado);
  } catch (err) {
    res.status(err.status || 500).json({ mensaje: err.message || 'Error interno del servidor.' });
  }
}

export function perfil(req, res) {
  res.json({ usuario: req.usuario });
}