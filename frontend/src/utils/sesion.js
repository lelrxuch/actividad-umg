// src/utils/sesion.js
//
// Quién tiene la sesión. LoginPage guarda `token` y `user` en localStorage.
// La lectura va protegida: en modo privado localStorage puede lanzar.

/** @returns {{id: number, nombre: string, email: string, rol: string}|null} */
export function usuarioActual() {
  try {
    if (!localStorage.getItem('token')) return null;
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch {
    return null;
  }
}

export function haySesion() {
  try {
    return Boolean(localStorage.getItem('token'));
  } catch {
    return false;
  }
}
