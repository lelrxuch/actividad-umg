// src/services/authService.js
import API from './api';

// 1. Registro de usuario (auth.routes.js)
export const registerUser = async (userData) => {
  try {
    const response = await API.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { message: 'Error de conexión con el servidor' };
  }
};

// 2. Inicio de sesión (auth.routes.js)
export const loginUser = async (credentials) => {
  try {
    const response = await API.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { message: 'Error de conexión con el servidor' };
  }
};

// 3. Solicitud de Recuperación de Clave (password.routes.js)
export const requestPasswordReset = async (email) => {
  try {
    const response = await API.post('/password/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { message: 'Error al solicitar la recuperación' };
  }
};