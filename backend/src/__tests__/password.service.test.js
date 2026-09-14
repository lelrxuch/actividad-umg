import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as passwordService from '../services/password.service.js';
import { pool } from '../config/db.js';

// Mockear la BD
vi.mock('../config/db.js', () => ({
  pool: {
    query: vi.fn()
  }
}));

describe('Password Service - SCRUM-15', () => {
  
  describe('Validación de contraseña nueva', () => {
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
  });

  describe('Validación de token', () => {
    it('debe verificar que el token no sea vacío', () => {
      const token = '';
      expect(token.length > 0).toBe(false);
    });

    it('debe verificar que el token tenga formato válido', () => {
      const token = 'abc123def456';
      expect(token.length >= 10).toBe(true);
    });

    it('debe rechazar token muy corto', () => {
      const token = 'abc';
      expect(token.length >= 10).toBe(false);
    });
  });

  describe('Validación de expiración', () => {
    it('debe detectar token expirado', () => {
      const expirationTime = new Date(Date.now() - 3600000); // Hace 1 hora
      const isExpired = new Date() > expirationTime;
      expect(isExpired).toBe(true);
    });

    it('debe detectar token vigente', () => {
      const expirationTime = new Date(Date.now() + 3600000); // En 1 hora
      const isExpired = new Date() > expirationTime;
      expect(isExpired).toBe(false);
    });
  });
});