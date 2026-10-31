// src/services/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:4000/api', 
});

/**
 * Adjunta el token de sesion a la peticion, si hay uno guardado.
 *
 * Se exporta para poder probarla directamente, en vez de tener que alcanzar los
 * internos de axios desde una prueba. Sin esta cabecera, toda peticion con
 * sesion recibe 401.
 *
 * `localStorage` puede lanzar en modo privado o con el almacenamiento
 * bloqueado, asi que la lectura va protegida: sin token la peticion sale igual
 * y el backend responde 401, que es un error manejado.
 *
 * @param {object} config Configuracion de la peticion de axios.
 * @returns {object} La misma configuracion, con la cabecera si corresponde.
 */
function leerToken() {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

export function agregarTokenDeSesion(config) {
  const token = leerToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}

API.interceptors.request.use(agregarTokenDeSesion);

export default API;