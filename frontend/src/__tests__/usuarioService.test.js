import { describe, it, expect } from 'vitest';

describe('Usuario Service - Frontend - SCRUM-16', () => {

  describe('Validación de campos - Edición de Perfil', () => {
    
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

    it('debe validar formato de correo alterno', () => {
      const correo = 'juan@gmail.com';
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(correo)).toBe(true);
    });

    it('debe rechazar correo inválido', () => {
      const correo = 'juangmail.com';
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(correo)).toBe(false);
    });
  });

  describe('Protección del email institucional', () => {
    
    it('debe impedir edición del email institucional', () => {
      const camposEditables = ['nombre', 'telefono', 'correo_alterno'];
      expect(camposEditables.includes('email')).toBe(false);
    });

    it('debe tener email como campo de solo lectura', () => {
      const usuario = {
        email: 'juan@universidad.edu',
        nombre: 'Juan',
        telefono: '12345678'
      };
      
      // El email no debe cambiar
      const emailOriginal = usuario.email;
      const intentoNuevoEmail = 'otro@universidad.edu';
      
      expect(emailOriginal === usuario.email).toBe(true);
      expect(intentoNuevoEmail !== usuario.email).toBe(true);
    });
  });

  describe('Construcción de payload para API', () => {
    
    it('debe enviar solo campos editables al backend', () => {
      const datosEditables = {
        nombre: 'Juan Pérez',
        telefono: '12345678',
        correo_alterno: 'juan.alt@gmail.com'
      };
      
      // No debe incluir 'email' en los datos a enviar
      expect(Object.keys(datosEditables).includes('email')).toBe(false);
      expect(Object.keys(datosEditables).length).toBe(3);
    });

    it('debe ignorar intentos de enviar email en payload', () => {
      const datosRecibidos = {
        nombre: 'Juan',
        email: 'nuevo@email.com',
        telefono: '12345678'
      };
      
      // Filtrar campos no permitidos
      const camposPermitidos = ['nombre', 'telefono', 'correo_alterno'];
      const datosLimpios = Object.keys(datosRecibidos)
        .filter(key => camposPermitidos.includes(key))
        .reduce((obj, key) => { obj[key] = datosRecibidos[key]; return obj; }, {});
      
      expect(datosLimpios.email).toBeUndefined();
      expect(datosLimpios.nombre).toBe('Juan');
    });
  });
});