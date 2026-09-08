// src/services/authService.js
import API from './api';


export const registerUser = async (userData) => {
  try {
    const response = await API.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Error de conexión con el servidor');
  }
};

// Inicio de sesión (Simulado temporalmente)
export const loginUser = async (credentials) => {
  try {
    const response = await API.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Error de conexión con el servidor');
  }
};

// Solicitud de Recuperación de Clave (Conectado con password.routes.js)
export const requestPasswordReset = async (email) => {
  try {
    const response = await API.post('/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Error al solicitar la recuperación');
  }
};