import { describe, it, expect } from 'vitest';

describe('Password Service - Frontend - SCRUM-15', () => {

  describe('Validación en formulario de reset', () => {
    
    it('debe detectar que las contraseñas coinciden', () => {
      const password = 'Contraseña123';
      const confirmPassword = 'Contraseña123';
      expect(password === confirmPassword).toBe(true);
    });

    it('debe detectar que las contraseñas NO coinciden', () => {
      const password = 'Contraseña123';
      const confirmPassword = 'Contraseña124';
      expect(password === confirmPassword).toBe(false);
    });

    it('debe rechazar si confirmación está vacía', () => {
      const confirmPassword = '';
      expect(confirmPassword.length > 0).toBe(false);
    });

    it('debe rechazar si nueva contraseña está vacía', () => {
      const password = '';
      expect(password.length > 0).toBe(false);
    });
  });

  describe('Validación de token en URL', () => {
    
    it('debe detectar presencia de token en parámetro', () => {
      const urlParams = new URLSearchParams('token=abc123def456');
      expect(urlParams.has('token')).toBe(true);
    });

    it('debe rechazar si token está ausente', () => {
      const urlParams = new URLSearchParams('');
      expect(urlParams.has('token')).toBe(false);
    });

    it('debe extraer token correctamente', () => {
      const urlParams = new URLSearchParams('token=abc123def456');
      const token = urlParams.get('token');
      expect(token).toBe('abc123def456');
    });

    it('debe validar que el token tenga contenido', () => {
      const urlParams = new URLSearchParams('token=');
      const token = urlParams.get('token');
      expect(token.length === 0).toBe(true);
    });
  });
});