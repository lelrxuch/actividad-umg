// Pruebas de registro y login (SCRUM-19 / SCRUM-20).
//
// Importan y ejecutan el código real: el repositorio está mockeado porque es la
// frontera con la base, pero bcrypt, jwt y el validador de contraseña corren de
// verdad. Si se volvieran a declarar aquí las reglas que se quieren probar, la
// prueba se estaría verificando a sí misma y pasaría aunque el service
// estuviera roto.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as authService from '../services/auth.service.js';
import * as usuarioRepo from '../repositories/usuario.repository.js';

vi.mock('../repositories/usuario.repository.js', () => ({
  findByEmail: vi.fn(),
  crearUsuario: vi.fn(),
}));

const SECRETO = 'secreto-de-prueba';
process.env.JWT_SECRET = SECRETO;

/** Usuario tal como lo devolvería la base tras un INSERT. */
function usuarioCreado(extra = {}) {
  return {
    id: 7,
    nombre: 'Juan Pérez',
    email: 'juan@miumg.edu.gt',
    rol: 'estudiante',
    creado_en: new Date(),
    ...extra,
  };
}

describe('auth.service — registro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usuarioRepo.findByEmail.mockResolvedValue(null);
    usuarioRepo.crearUsuario.mockResolvedValue(usuarioCreado());
  });

  const datosValidos = {
    nombre: 'Juan Pérez',
    email: 'juan@miumg.edu.gt',
    password: 'Password1',
  };

  it('registra un usuario válido y devuelve token', async () => {
    const resultado = await authService.registrar(datosValidos);

    expect(resultado.usuario).toEqual({
      id: 7,
      nombre: 'Juan Pérez',
      email: 'juan@miumg.edu.gt',
      rol: 'estudiante',
    });
    expect(typeof resultado.token).toBe('string');
  });

  it('guarda la contraseña como hash de bcrypt, nunca en claro', async () => {
    await authService.registrar(datosValidos);

    const [, , hashGuardado] = usuarioRepo.crearUsuario.mock.calls[0];
    // El prefijo $2a$/$2b$/$2y$ es lo único que distingue un hash real de un
    // texto cualquiera: expect.any(String) dejaría pasar la contraseña en claro.
    expect(hashGuardado).toMatch(/^\$2[aby]\$/);
    expect(hashGuardado).not.toBe(datosValidos.password);
    await expect(bcrypt.compare(datosValidos.password, hashGuardado)).resolves.toBe(true);
  });

  it('nunca devuelve el hash de la contraseña al cliente', async () => {
    const resultado = await authService.registrar(datosValidos);
    expect(resultado.usuario).not.toHaveProperty('password_hash');
    expect(JSON.stringify(resultado)).not.toContain('$2');
  });

  it('el token lleva el id, el correo y el rol, y se verifica con el secreto', async () => {
    const { token } = await authService.registrar(datosValidos);
    const payload = jwt.verify(token, SECRETO);

    expect(payload.sub).toBe(7);
    expect(payload.email).toBe('juan@miumg.edu.gt');
    expect(payload.rol).toBe('estudiante');
  });

  it('normaliza el correo a minúsculas y sin espacios antes de guardarlo', async () => {
    await authService.registrar({ ...datosValidos, email: '  JUAN@MIUMG.EDU.GT  ' });

    const [, emailGuardado] = usuarioRepo.crearUsuario.mock.calls[0];
    expect(emailGuardado).toBe('juan@miumg.edu.gt');
  });

  it('recorta los espacios del nombre antes de guardarlo', async () => {
    await authService.registrar({ ...datosValidos, nombre: '  Juan Pérez  ' });

    const [nombreGuardado] = usuarioRepo.crearUsuario.mock.calls[0];
    expect(nombreGuardado).toBe('Juan Pérez');
  });

  it('rechaza con 409 si el correo ya está registrado', async () => {
    usuarioRepo.findByEmail.mockResolvedValueOnce(usuarioCreado());

    await expect(authService.registrar(datosValidos)).rejects.toMatchObject({ status: 409 });
    expect(usuarioRepo.crearUsuario).not.toHaveBeenCalled();
  });

  it.each([
    ['sin nombre', { nombre: '' }],
    ['nombre de una sola letra', { nombre: 'J' }],
    ['nombre solo con espacios', { nombre: '   ' }],
    ['nombre ausente', { nombre: undefined }],
  ])('rechaza con 400: %s', async (_caso, parche) => {
    await expect(authService.registrar({ ...datosValidos, ...parche })).rejects.toMatchObject({
      status: 400,
    });
    expect(usuarioRepo.crearUsuario).not.toHaveBeenCalled();
  });

  it.each([
    ['correo sin arroba', 'juanmiumg.edu.gt'],
    ['correo de dominio ajeno', 'juan@gmail.com'],
    ['correo vacío', ''],
    ['dominio parecido pero distinto', 'juan@miumg.edu.gt.falso.com'],
  ])('rechaza con 400 el correo no institucional: %s', async (_caso, email) => {
    await expect(authService.registrar({ ...datosValidos, email })).rejects.toMatchObject({
      status: 400,
    });
    expect(usuarioRepo.crearUsuario).not.toHaveBeenCalled();
  });

  it.each([
    ['sin mayúscula', 'password1'],
    ['sin número', 'Password'],
    ['menos de 8 caracteres', 'Pass1'],
  ])('rechaza con 400 la contraseña débil: %s', async (_caso, password) => {
    await expect(authService.registrar({ ...datosValidos, password })).rejects.toMatchObject({
      status: 400,
    });
    expect(usuarioRepo.crearUsuario).not.toHaveBeenCalled();
  });

  it('aplica la misma política de contraseña que el módulo compartido', async () => {
    // Si alguien copia el regex dentro del service y lo cambia, esta prueba
    // se cae aunque la del validador siga pasando.
    const { esContrasenaValida } = await import('../validators/password.validator.js');
    const candidata = 'Abcdefg1';

    expect(esContrasenaValida(candidata)).toBe(true);
    await expect(
      authService.registrar({ ...datosValidos, password: candidata })
    ).resolves.toBeTruthy();
  });
});

describe('auth.service — login', () => {
  let hashReal;

  beforeEach(async () => {
    vi.clearAllMocks();
    hashReal = await bcrypt.hash('Password1', 10);
  });

  it('autentica con las credenciales correctas y devuelve token', async () => {
    usuarioRepo.findByEmail.mockResolvedValueOnce(
      usuarioCreado({ password_hash: hashReal })
    );

    const resultado = await authService.login({
      email: 'juan@miumg.edu.gt',
      password: 'Password1',
    });

    expect(resultado.usuario.id).toBe(7);
    expect(jwt.verify(resultado.token, SECRETO).sub).toBe(7);
  });

  it('rechaza con 401 si la contraseña no coincide', async () => {
    usuarioRepo.findByEmail.mockResolvedValueOnce(
      usuarioCreado({ password_hash: hashReal })
    );

    await expect(
      authService.login({ email: 'juan@miumg.edu.gt', password: 'OtraCosa9' })
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rechaza con 401 si el usuario no existe', async () => {
    usuarioRepo.findByEmail.mockResolvedValueOnce(null);

    await expect(
      authService.login({ email: 'nadie@miumg.edu.gt', password: 'Password1' })
    ).rejects.toMatchObject({ status: 401 });
  });

  it('no filtra si el correo existe: mismo mensaje en ambos casos', async () => {
    usuarioRepo.findByEmail.mockResolvedValueOnce(null);
    const sinUsuario = await authService
      .login({ email: 'nadie@miumg.edu.gt', password: 'Password1' })
      .catch((e) => e.message);

    usuarioRepo.findByEmail.mockResolvedValueOnce(
      usuarioCreado({ password_hash: hashReal })
    );
    const conUsuario = await authService
      .login({ email: 'juan@miumg.edu.gt', password: 'Incorrecta9' })
      .catch((e) => e.message);

    expect(sinUsuario).toBe(conUsuario);
  });

  it('rechaza con 400 un correo no institucional antes de tocar la base', async () => {
    await expect(
      authService.login({ email: 'juan@gmail.com', password: 'Password1' })
    ).rejects.toMatchObject({ status: 400 });

    expect(usuarioRepo.findByEmail).not.toHaveBeenCalled();
  });

  it('no revienta si no viene contraseña', async () => {
    usuarioRepo.findByEmail.mockResolvedValueOnce(
      usuarioCreado({ password_hash: hashReal })
    );

    await expect(
      authService.login({ email: 'juan@miumg.edu.gt' })
    ).rejects.toMatchObject({ status: 401 });
  });

  it('busca al usuario con el correo normalizado', async () => {
    usuarioRepo.findByEmail.mockResolvedValueOnce(
      usuarioCreado({ password_hash: hashReal })
    );

    await authService.login({ email: '  JUAN@MIUMG.EDU.GT ', password: 'Password1' });

    expect(usuarioRepo.findByEmail).toHaveBeenCalledWith('juan@miumg.edu.gt');
  });
});
