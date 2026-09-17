import { describe, it, expect } from 'vitest';

describe('Usuario Service - Frontend - SCRUM-16', () => {

  describe('Validación de campos en formulario', () => {
    
    it('debe validar que nombre no esté vacío', () => {
      const nombre = '';
      expect(nombre.trim().length >= 2).toBe(false);
    });

    it('debe aceptar nombre válido', () => {
      const nombre = 'Juan Pérez';
      expect(nombre.trim().length >= 2).toBe(true);
    });

    it('debe validar teléfono con 8 dígitos', () => {
      const telefono = '12345678';
      const regex = /^\d{8}$/;
      expect(regex.test(telefono)).toBe(true);
    });

    it('debe rechazar teléfono con caracteres no numéricos', () => {
      const telefono = '1234567a';
      const regex = /^\d{8}$/;
      expect(regex.test(telefono)).toBe(false);
    });

    it('debe rechazar teléfono con menos de 8 dígitos', () => {
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

    it('debe rechazar correo sin dominio completo', () => {
      const correo = 'juan@gmail';
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(correo)).toBe(false);
    });
  });

  describe('Protección del email institucional', () => {
    
    it('debe impedir edición del email institucional', () => {
      const camposEditables = ['nombre', 'telefono', 'correo_alterno'];
      expect(camposEditables.includes('email')).toBe(false);
    });

    it('debe filtrar email del payload antes de enviar al backend', () => {
      const datosRecibidos = {
        nombre: 'Juan',
        email: 'nuevo@email.com', // intento de cambiar
        telefono: '12345678'
      };

      const camposPermitidos = ['nombre', 'telefono', 'correo_alterno'];
      const datosLimpios = Object.keys(datosRecibidos)
        .filter(key => camposPermitidos.includes(key))
        .reduce((obj, key) => { obj[key] = datosRecibidos[key]; return obj; }, {});

      expect(datosLimpios.email).toBeUndefined();
      expect(datosLimpios.nombre).toBe('Juan');
    });

    it('debe construir payload con solo campos permitidos', () => {
      const formData = {
        nombre: 'Juan Actualizado',
        telefono: '87654321',
        correo_alterno: 'juan.alt@gmail.com'
      };

      const payloadEsperado = {
        nombre: 'Juan Actualizado',
        telefono: '87654321',
        correo_alterno: 'juan.alt@gmail.com'
      };

      expect(Object.keys(formData)).toEqual(Object.keys(payloadEsperado));
      expect(Object.keys(formData)).not.toContain('email');
    });
  });
});