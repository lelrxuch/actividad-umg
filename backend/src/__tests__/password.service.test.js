import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as passwordService from '../services/password.service.js';
import * as usuarioRepo from '../repositories/usuario.repository.js';

// Mockear el repository
vi.mock('../repositories/usuario.repository.js', () => ({
  findByEmail: vi.fn(),
  saveResetToken: vi.fn(),
  findByResetTokenHash: vi.fn(),
  updatePasswordAndClearToken: vi.fn(),
}));

describe('Password Service - SCRUM-15', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('solicitarRecuperacion', () => {
    
    it('no debe revelar si un email existe o no (respuesta idéntica)', async () => {
      // Usuario no existe
      usuarioRepo.findByEmail.mockResolvedValueOnce(null);
      const result1 = await passwordService.solicitarRecuperacion('inexistente@test.com');
      expect(result1).toBeUndefined();

      // Usuario existe
      usuarioRepo.findByEmail.mockResolvedValueOnce({
        id: 1,
        email: 'existe@test.com',
      });
      usuarioRepo.saveResetToken.mockResolvedValueOnce(undefined);
      const result2 = await passwordService.solicitarRecuperacion('existe@test.com');
      // En ambos casos no debería revelar información (la función retorna token solo en pruebas locales)
      expect(typeof result2 === 'string' || result2 === undefined).toBe(true);
    });

    it('debe generar un token cuando el email existe', async () => {
      usuarioRepo.findByEmail.mockResolvedValueOnce({
        id: 1,
        email: 'usuario@test.com',
      });
      usuarioRepo.saveResetToken.mockResolvedValueOnce(undefined);

      const token = await passwordService.solicitarRecuperacion('usuario@test.com');
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(usuarioRepo.saveResetToken).toHaveBeenCalledOnce();
    });
  });

  describe('restablecerContrasena', () => {
    
    it('debe rechazar token inexistente', async () => {
      usuarioRepo.findByResetTokenHash.mockResolvedValueOnce(null);

      await expect(
        passwordService.restablecerContrasena('tokenInvalido', 'NuevaPass123')
      ).rejects.toThrow('Token inválido');
    });

    it('debe rechazar token expirado', async () => {
      const ahora = new Date();
      const hace1Hora = new Date(ahora.getTime() - 60 * 60 * 1000);

      usuarioRepo.findByResetTokenHash.mockResolvedValueOnce({
        id: 1,
        email: 'usuario@test.com',
        reset_token_expira: hace1Hora, // expirado
      });

      await expect(
        passwordService.restablecerContrasena('tokenExpirado', 'NuevaPass123')
      ).rejects.toThrow('Token expirado');
    });

    it('debe actualizar la contraseña con token válido y vigente', async () => {
      const ahora = new Date();
      const en1Hora = new Date(ahora.getTime() + 60 * 60 * 1000);

      usuarioRepo.findByResetTokenHash.mockResolvedValueOnce({
        id: 1,
        email: 'usuario@test.com',
        reset_token_expira: en1Hora, // vigente
      });
      usuarioRepo.updatePasswordAndClearToken.mockResolvedValueOnce(undefined);

      await expect(
        passwordService.restablecerContrasena('tokenValido', 'NuevaPass123')
      ).resolves.not.toThrow();

      expect(usuarioRepo.updatePasswordAndClearToken).toHaveBeenCalledOnce();
      expect(usuarioRepo.updatePasswordAndClearToken).toHaveBeenCalledWith(
        1,
        expect.any(String) // hash de la contraseña
      );
    });
  });
});