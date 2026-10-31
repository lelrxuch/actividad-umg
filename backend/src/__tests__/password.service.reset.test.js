import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import * as passwordService from '../services/password.service.js';
import * as usuarioRepo from '../repositories/usuario.repository.js';
import { MENSAJE_CONTRASENA_INVALIDA } from '../validators/password.validator.js';

vi.mock('../repositories/usuario.repository.js', () => ({
  findByEmail: vi.fn(),
  saveResetToken: vi.fn(),
  findByResetTokenHash: vi.fn(),
  updatePasswordAndClearToken: vi.fn(),
}));

/** Devuelve una fila de `usuarios` con el token vigente, como la entrega el repository. */
function usuarioConTokenVigente() {
  return {
    id: 7,
    email: 'estudiante@miumg.edu.gt',
    password_hash: '$2a$10$hashAnterior',
    reset_token_hash: 'hashDelToken',
    reset_token_expira: new Date(Date.now() + 30 * 60 * 1000),
  };
}

describe('restablecerContrasena — fuerza de la contraseña nueva (SCRUM-29)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usuarioRepo.findByResetTokenHash.mockResolvedValue(usuarioConTokenVigente());
    usuarioRepo.updatePasswordAndClearToken.mockResolvedValue(undefined);
  });

  it('acepta una contraseña que cumple la política y persiste el hash', async () => {
    await expect(
      passwordService.restablecerContrasena('tokenVigente', 'Password1')
    ).resolves.toBeUndefined();

    expect(usuarioRepo.updatePasswordAndClearToken).toHaveBeenCalledOnce();

    const [idUsuario, hashGuardado] = usuarioRepo.updatePasswordAndClearToken.mock.calls[0];
    expect(idUsuario).toBe(7);
    // Debe guardarse un hash bcrypt real, nunca la contraseña en claro.
    expect(hashGuardado).not.toBe('Password1');
    expect(hashGuardado).toMatch(/^\$2[aby]\$\d{2}\$/);
    await expect(bcrypt.compare('Password1', hashGuardado)).resolves.toBe(true);
  });

  it.each([
    ['Pass1', 'es más corta que 8 caracteres'],
    ['password1', 'no tiene mayúscula'],
    ['Password', 'no tiene número'],
  ])('rechaza %j porque %s', async (contrasenaDebil) => {
    await expect(
      passwordService.restablecerContrasena('tokenVigente', contrasenaDebil)
    ).rejects.toThrow(MENSAJE_CONTRASENA_INVALIDA);
  });

  it('no escribe en la base de datos cuando la contraseña es débil', async () => {
    await expect(
      passwordService.restablecerContrasena('tokenVigente', '123')
    ).rejects.toThrow(MENSAJE_CONTRASENA_INVALIDA);

    expect(usuarioRepo.updatePasswordAndClearToken).not.toHaveBeenCalled();
  });

  it('valida la contraseña antes de consultar el token, para no filtrar si el token existe', async () => {
    await expect(
      passwordService.restablecerContrasena('tokenInventado', '123')
    ).rejects.toThrow(MENSAJE_CONTRASENA_INVALIDA);

    expect(usuarioRepo.findByResetTokenHash).not.toHaveBeenCalled();
  });

  it('sigue rechazando el token inexistente cuando la contraseña sí cumple', async () => {
    usuarioRepo.findByResetTokenHash.mockResolvedValueOnce(null);

    await expect(
      passwordService.restablecerContrasena('tokenInvalido', 'Password1')
    ).rejects.toThrow('Token inválido');
  });

  it('sigue rechazando el token expirado cuando la contraseña sí cumple', async () => {
    usuarioRepo.findByResetTokenHash.mockResolvedValueOnce({
      ...usuarioConTokenVigente(),
      reset_token_expira: new Date(Date.now() - 60 * 60 * 1000),
    });

    await expect(
      passwordService.restablecerContrasena('tokenExpirado', 'Password1')
    ).rejects.toThrow('Token expirado');
  });
});
