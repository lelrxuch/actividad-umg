import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { buscarPorCorreo, crearUsuario } from '../repositories/usuarioRepository.js';

const DOMINIO_INSTITUCIONAL = (process.env.ALLOWED_EMAIL_DOMAIN || 'miumg.edu.gt').toLowerCase();
const REGEX_CONTRASENA = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

function errorConEstado(mensaje, status) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function validarCorreoInstitucional(correo) {
  const limpio = (correo || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
    throw errorConEstado('El formato del correo no es válido.', 400);
  }
  if (!limpio.endsWith('@' + DOMINIO_INSTITUCIONAL)) {
    throw errorConEstado('Solo se aceptan correos institucionales @' + DOMINIO_INSTITUCIONAL + '.', 400);
  }
  return limpio;
}

function validarContrasena(contrasena) {
  if (!REGEX_CONTRASENA.test(contrasena || '')) {
    throw errorConEstado('La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.', 400);
  }
}

function generarToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, correo: usuario.correo },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
}

export async function registrar({ correo, contrasena }) {
  const correoValido = validarCorreoInstitucional(correo);
  validarContrasena(contrasena);

  const existente = await buscarPorCorreo(correoValido);
  if (existente) {
    throw errorConEstado('Ya existe una cuenta registrada con ese correo.', 409);
  }

  const hash = await bcrypt.hash(contrasena, 10);
  const usuario = await crearUsuario(correoValido, hash);
  const token = generarToken(usuario);

  return { usuario: { id: usuario.id, correo: usuario.correo }, token };
}

export async function login({ correo, contrasena }) {
  const correoValido = validarCorreoInstitucional(correo);
  const usuario = await buscarPorCorreo(correoValido);
  if (!usuario) {
    throw errorConEstado('Credenciales inválidas.', 401);
  }
  const coincide = await bcrypt.compare(contrasena || '', usuario.contrasena_hash);
  if (!coincide) {
    throw errorConEstado('Credenciales inválidas.', 401);
  }
  const token = generarToken(usuario);
  return { usuario: { id: usuario.id, correo: usuario.correo }, token };
}