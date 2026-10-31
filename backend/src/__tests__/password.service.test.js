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
      // El token nunca sale de la función: si saliera, alguien lo pondría en la respuesta.
      expect(result2).toBeUndefined();
    });

    it('debe generar y guardar un token cuando el email existe, sin devolverlo', async () => {
      usuarioRepo.findByEmail.mockResolvedValueOnce({
        id: 1,
        email: 'usuario@test.com',
      });
      usuarioRepo.saveResetToken.mockResolvedValueOnce(undefined);

      const resultado = await passwordService.solicitarRecuperacion('usuario@test.com');

      expect(resultado).toBeUndefined();
      expect(usuarioRepo.saveResetToken).toHaveBeenCalledOnce();
      // Se guarda el hash SHA-256 (64 hex), nunca el token en claro.
      const [id, tokenHash, expiraEn] = usuarioRepo.saveResetToken.mock.calls[0];
      expect(id).toBe(1);
      expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(expiraEn).toBeInstanceOf(Date);
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
        expect.stringMatching(/^\$2[aby]\$/) // hash de la contraseña
      );
    });
  });
});