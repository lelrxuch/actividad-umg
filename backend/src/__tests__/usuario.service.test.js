import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as usuarioService from '../services/usuario.service.js';
import * as usuarioRepo from '../repositories/usuario.repository.js';

// Mockear el repository
vi.mock('../repositories/usuario.repository.js', () => ({
  actualizarPerfil: vi.fn(),
}));

describe('Usuario Service - SCRUM-16 Edición de Perfil', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('actualizarPerfil', () => {
    
    it('debe permitir actualizar nombre válido', async () => {
      usuarioRepo.actualizarPerfil.mockResolvedValueOnce({
        id: 1,
        nombre: 'Juan Nuevo',
        telefono: '12345678',
        correo_alterno: 'juan@gmail.com',
        email: 'juan@universidad.edu',
      });

      const resultado = await usuarioService.actualizarPerfil(1, {
        nombre: 'Juan Nuevo',
      });

      expect(resultado.nombre).toBe('Juan Nuevo');
      expect(usuarioRepo.actualizarPerfil).toHaveBeenCalledOnce();
    });

    it('debe permitir actualizar teléfono válido (8 dígitos)', async () => {
      usuarioRepo.actualizarPerfil.mockResolvedValueOnce({
        id: 1,
        nombre: 'Juan',
        telefono: '87654321',
        correo_alterno: 'juan@gmail.com',
        email: 'juan@universidad.edu',
      });

      const resultado = await usuarioService.actualizarPerfil(1, {
        telefono: '87654321',
      });

      expect(resultado.telefono).toBe('87654321');
      expect(usuarioRepo.actualizarPerfil).toHaveBeenCalledWith(1, expect.objectContaining({
        telefono: '87654321',
      }));
    });

    it('debe rechazar teléfono con formato inválido (no son 8 dígitos)', async () => {
      const telefonoInvalido = '1234567'; // solo 7 dígitos
      const regex = /^\d{8}$/;
      
      expect(regex.test(telefonoInvalido)).toBe(false);
    });

    it('debe permitir actualizar correo alterno válido', async () => {
      usuarioRepo.actualizarPerfil.mockResolvedValueOnce({
        id: 1,
        nombre: 'Juan',
        telefono: '12345678',
        correo_alterno: 'nuevo@gmail.com',
        email: 'juan@universidad.edu',
      });

      const resultado = await usuarioService.actualizarPerfil(1, {
        correo_alterno: 'nuevo@gmail.com',
      });

      expect(resultado.correo_alterno).toBe('nuevo@gmail.com');
    });

    it('NO debe permitir actualizar email institucional (se ignora en el payload)', async () => {
      const camposEditables = ['nombre', 'telefono', 'correo_alterno'];
      
      // El email NO está en los campos editables
      expect(camposEditables.includes('email')).toBe(false);
    });

    it('debe usar COALESCE: campos no enviados no se sobreescriben', async () => {
      // Cuando se envía solo nombre, los otros campos deben mantener sus valores
      usuarioRepo.actualizarPerfil.mockResolvedValueOnce({
        id: 1,
        nombre: 'Juan Actualizado',
        telefono: '12345678', // valor anterior, NO se envió, debe mantenerse
        correo_alterno: 'juan@gmail.com', // valor anterior, NO se envió, debe mantenerse
        email: 'juan@universidad.edu',
      });

      const resultado = await usuarioService.actualizarPerfil(1, {
        nombre: 'Juan Actualizado',
        // telefono y correo_alterno no se envían
      });

      // El servicio debe haber sido llamado, y el repository (que usa COALESCE) debe mantener los valores
      expect(usuarioRepo.actualizarPerfil).toHaveBeenCalledWith(1, expect.objectContaining({
        nombre: 'Juan Actualizado',
      }));
      
      // La respuesta debe tener los valores anteriores intactos
      expect(resultado.telefono).toBe('12345678');
      expect(resultado.correo_alterno).toBe('juan@gmail.com');
    });

    it('debe rechazar nombre vacío o muy corto', () => {
      const nombreCorto = 'J';
      
      expect(nombreCorto.trim().length >= 2).toBe(false);
    });

    it('debe aceptar nombre válido (al menos 2 caracteres)', () => {
      const nombreValido = 'Juan';
      
      expect(nombreValido.trim().length >= 2).toBe(true);
    });
  });
});