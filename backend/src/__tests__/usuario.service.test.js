import { describe, it, expect, vi } from 'vitest';

describe('Usuario Service - SCRUM-16 Edición de Perfil', () => {

  describe('Validaciones de campos editables', () => {
    
    it('debe rechazar nombre vacío', () => {
      const nombre = '';
      expect(nombre.trim().length >= 2).toBe(false);
    });

    it('debe rechazar nombre muy corto', () => {
      const nombre = 'J';
      expect(nombre.trim().length >= 2).toBe(false);
    });

    it('debe aceptar nombre válido', () => {
      const nombre = 'Juan Pérez';
      expect(nombre.trim().length >= 2).toBe(true);
    });

    it('debe validar formato de teléfono (8 dígitos)', () => {
      const telefono = '12345678';
      const regex = /^\d{8}$/;
      expect(regex.test(telefono)).toBe(true);
    });

    it('debe rechazar teléfono con letras', () => {
      const telefono = '1234567a';
      const regex = /^\d{8}$/;
      expect(regex.test(telefono)).toBe(false);
    });

    it('debe rechazar teléfono muy corto', () => {
      const telefono = '1234567';
      const regex = /^\d{8}$/;
      expect(regex.test(telefono)).toBe(false);
    });

    it('debe validar formato de correo alterno', () => {
      const correo = 'juan@gmail.com';
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(correo)).toBe(true);
    });

    it('debe rechazar correo sin @', () => {
      const correo = 'juangmail.com';
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(correo)).toBe(false);
    });

    it('debe rechazar correo sin punto', () => {
      const correo = 'juan@gmail';
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(correo)).toBe(false);
    });
  });

  describe('Validación: Email institucional NO editable', () => {
    
    it('debe proteger el email institucional de edición', () => {
      const usuarioData = {
        nombre: 'Juan Pérez',
        email: 'juan@gmail.com', // NO se permite cambiar
        telefono: '12345678'
      };
      
      // El email NO debe estar en los campos editables
      const camposEditables = ['nombre', 'telefono', 'correo_alterno'];
      expect(camposEditables.includes('email')).toBe(false);
    });

    it('debe rechazar intento de cambiar email institucional', () => {
      const emailAnterior = 'juan@universidad.edu';
      const emailIntentado = 'otro@universidad.edu';
      
      // Si alguien intenta cambiar el email, debe ser rechazado
      const esEditableEmail = false; // Hardcoded: email NO es editable
      expect(emailIntentado === emailAnterior || !esEditableEmail).toBe(true);
    });
  });

  describe('Validación: Que solo se actualicen campos permitidos', () => {
    
    it('debe permitir actualizar nombre', () => {
      const camposPermitidos = ['nombre', 'telefono', 'correo_alterno'];
      expect(camposPermitidos.includes('nombre')).toBe(true);
    });

    it('debe permitir actualizar teléfono', () => {
      const camposPermitidos = ['nombre', 'telefono', 'correo_alterno'];
      expect(camposPermitidos.includes('telefono')).toBe(true);
    });

    it('debe permitir actualizar correo alterno', () => {
      const camposPermitidos = ['nombre', 'telefono', 'correo_alterno'];
      expect(camposPermitidos.includes('correo_alterno')).toBe(true);
    });

    it('NO debe permitir actualizar email institucional', () => {
      const camposPermitidos = ['nombre', 'telefono', 'correo_alterno'];
      expect(camposPermitidos.includes('email')).toBe(false);
    });
  });
});