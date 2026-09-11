const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function peticion(ruta, opciones = {}) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    headers: { 'Content-Type': 'application/json', ...(opciones.headers || {}) },
    ...opciones,
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.mensaje || 'Ocurrió un error inesperado.');
  }
  return datos;
}

export function registrar(correo, contrasena) {
  return peticion('/auth/registro', {
    method: 'POST',
    body: JSON.stringify({ correo, contrasena }),
  });
}

export function iniciarSesion(correo, contrasena) {
  return peticion('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ correo, contrasena }),
  });
}

export function obtenerPerfil(token) {
  return peticion('/auth/perfil', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
