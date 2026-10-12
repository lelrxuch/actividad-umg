// Lógica de negocio de autenticación: registro y login.
//
// CONTRATO DE LA API (SCRUM-21)
// Los nombres de abajo no se eligieron aquí: salen de lo que ya está mergeado
// en develop, que es la única fuente que no depende de la opinión de nadie.
//   - password.controller.js ya lee `email` del body
//   - backend/db/schema.sql define las columnas email, password_hash y nombre
//   - la colección Postman de SCRUM-27 ya documenta /api/auth/register y
//     /api/auth/login como los endpoints pendientes
//   - el frontend de registro ya manda email y password
// Por eso el body es { nombre, email, password } y no { correo, contrasena }.
//
// La política de fuerza de contraseña NO se escribe aquí: vive en
// password.validator.js, que es la única fuente de verdad del proyecto. Tener
// una segunda copia es exactamente el hueco que reportó SCRUM-29.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findByEmail, crearUsuario } from '../repositories/usuario.repository.js';
import { validarContrasena } from '../validators/password.validator.js';

/** Costo de bcrypt. Igual al que ya usa password.service.js. */
const RONDAS_BCRYPT = 10;

/**
 * Dominios institucionales aceptados.
 *
 * Se lee de entorno a propósito: el equipo todavía no acordó si se acepta solo
 * @miumg.edu.gt o también los dominios de MINEDUC y USAC. Dejarlo en config
 * hace que esa decisión sea una línea del .env y no otro Pull Request.
 * @type {string[]}
 */
const DOMINIOS_PERMITIDOS = (process.env.ALLOWED_EMAIL_DOMAINS || 'miumg.edu.gt')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Construye un error de negocio con su código HTTP, igual que
 * password.validator.js, para que el controller lo traduzca sin inventar un 500.
 * @param {string} mensaje
 * @param {number} status
 * @returns {Error & { status: number }}
 */
function errorDeNegocio(mensaje, status) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

/**
 * Normaliza y valida que el correo sea institucional.
 * @param {unknown} email
 * @returns {string} El correo en minúsculas y sin espacios alrededor.
 * @throws {Error & { status: number }} 400 si el formato o el dominio no sirven.
 */
export function validarEmailInstitucional(email) {
  const limpio = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!FORMATO_EMAIL.test(limpio)) {
    throw errorDeNegocio('El formato del correo no es válido.', 400);
  }

  const dominio = limpio.slice(limpio.lastIndexOf('@') + 1);
  if (!DOMINIOS_PERMITIDOS.includes(dominio)) {
    throw errorDeNegocio(
      `Solo se aceptan correos institucionales: ${DOMINIOS_PERMITIDOS.map((d) => '@' + d).join(', ')}.`,
      400
    );
  }

  return limpio;
}

/**
 * Valida el nombre. La columna es NOT NULL, así que un registro sin nombre
 * reventaría en la base con un 500 en vez de decirle al usuario qué le falta.
 * @param {unknown} nombre
 * @returns {string}
 * @throws {Error & { status: number }} 400 si falta o es demasiado corto.
 */
export function validarNombre(nombre) {
  const limpio = typeof nombre === 'string' ? nombre.trim() : '';
  if (limpio.length < 2) {
    throw errorDeNegocio('El nombre es obligatorio y debe tener al menos 2 caracteres.', 400);
  }
  return limpio;
}

/**
 * Firma el token de sesión.
 * @param {{id: number, email: string, rol?: string}} usuario
 * @returns {string}
 */
function generarToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, email: usuario.email, rol: usuario.rol || 'estudiante' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
}

/**
 * Da de alta un usuario nuevo.
 *
 * @param {{nombre: string, email: string, password: string}} datos
 * @returns {Promise<{usuario: {id: number, nombre: string, email: string, rol: string}, token: string}>}
 * @throws {Error & { status: number }} 400 por datos inválidos, 409 si el correo ya existe.
 */
export async function registrar({ nombre, email, password }) {
  const nombreValido = validarNombre(nombre);
  const emailValido = validarEmailInstitucional(email);
  validarContrasena(password);

  const existente = await findByEmail(emailValido);
  if (existente) {
    throw errorDeNegocio('Ya existe una cuenta registrada con ese correo.', 409);
  }

  const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);
  const usuario = await crearUsuario(nombreValido, emailValido, passwordHash);

  return {
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    },
    token: generarToken(usuario),
  };
}

/**
 * Autentica a un usuario existente.
 *
 * Un correo desconocido y una contraseña incorrecta devuelven exactamente el
 * mismo error, por la misma razón que solicitarRecuperacion responde igual
 * exista o no el usuario: no filtrar qué correos están registrados.
 *
 * @param {{email: string, password: string}} datos
 * @returns {Promise<{usuario: {id: number, nombre: string, email: string, rol: string}, token: string}>}
 * @throws {Error & { status: number }} 400 si el correo no es institucional, 401 si no coincide.
 */
export async function login({ email, password }) {
  const emailValido = validarEmailInstitucional(email);

  const usuario = await findByEmail(emailValido);
  if (!usuario) {
    throw errorDeNegocio('Credenciales inválidas.', 401);
  }

  const coincide = await bcrypt.compare(
    typeof password === 'string' ? password : '',
    usuario.password_hash
  );
  if (!coincide) {
    throw errorDeNegocio('Credenciales inválidas.', 401);
  }

  return {
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    },
    token: generarToken(usuario),
  };
}
