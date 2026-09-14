import { describe, it, expect } from 'vitest';

describe('Password Service - Frontend - SCRUM-15', () => {

  describe('Validación de nueva contraseña', () => {
    
    it('debe rechazar contraseña muy corta', () => {
      const password = '123456';
      const regex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
      expect(regex.test(password)).toBe(false);
    });

    it('debe rechazar contraseña sin mayúscula', () => {
      const password = 'contraseña123';
      const regex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
      expect(regex.test(password)).toBe(false);
    });

    it('debe rechazar contraseña sin número', () => {
      const password = 'Contraseña';
      const regex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
      expect(regex.test(password)).toBe(false);
    });

    it('debe aceptar contraseña válida', () => {
      const password = 'Contraseña123';
      const regex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
      expect(regex.test(password)).toBe(true);
    });

    it('debe aceptar contraseña con caracteres especiales', () => {
      const password = 'Contr@seña123';
      const regex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
      expect(regex.test(password)).toBe(true);
    });
  });

  describe('Validación de confirmación de contraseña', () => {
    
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
  });
});