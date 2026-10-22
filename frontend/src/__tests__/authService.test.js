// Pruebas de src/services/authService.js
//
// POR QUE EXISTE ESTE ARCHIVO:
// El frontend tenia dos archivos de prueba, `usuarioService.test.js` y
// `passwordService.test.js`, que no importaban un solo modulo de produccion.
// Su unico import era de vitest y cada asercion comparaba literales escritos
// dentro de la propia prueba:
//
//     const password = 'Contraseña123';
//     const confirmPassword = 'Contraseña123';
//     expect(password === confirmPassword).toBe(true);
//
// Eso afirma que 'Contraseña123' === 'Contraseña123'. No puede fallar ni
// aunque se borre el frontend completo. Este archivo los reemplaza probando
// de verdad el service que esas pruebas decian cubrir.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import API from '../services/api';
import { registerUser, loginUser, requestPasswordReset } from '../services/authService';

vi.mock('../services/api', () => ({
  default: { post: vi.fn() },
}));

describe('registerUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia los datos a /auth/register y devuelve la respuesta', async () => {
    API.post.mockResolvedValue({ data: { id: 1, email: 'ana@miumg.edu.gt' } });

    const resultado = await registerUser({
      nombre: 'Ana Lucía Pérez',
      email: 'ana@miumg.edu.gt',
      password: 'Becas2026',
    });

    expect(API.post).toHaveBeenCalledWith('/auth/register', {
      nombre: 'Ana Lucía Pérez',
      email: 'ana@miumg.edu.gt',
      password: 'Becas2026',
    });
    expect(resultado).toEqual({ id: 1, email: 'ana@miumg.edu.gt' });
  });

  it('propaga el mensaje del backend cuando el dominio no es institucional', async () => {
    // El backend es el unico que sabe que dominios acepta: la lista vive en su
    // .env. La pantalla debe mostrar SU mensaje, que enumera los dominios
    // validos, y no un texto propio que quedaria desactualizado.
    const mensaje =
      'Solo se aceptan correos institucionales: @miumg.edu.gt, @mineduc.gob.gt, @usac.edu.gt.';
    API.post.mockRejectedValue({ response: { data: { error: mensaje } } });

    await expect(
      registerUser({ nombre: 'Ajena', email: 'ajena@gmail.com', password: 'Becas2026' })
    ).rejects.toThrow(mensaje);
  });

  it('propaga el mensaje del backend cuando el correo ya existe', async () => {
    API.post.mockRejectedValue({
      response: { data: { error: 'Ya existe una cuenta registrada con ese correo.' } },
    });

    await expect(
      registerUser({ nombre: 'Ana', email: 'ana@miumg.edu.gt', password: 'Becas2026' })
    ).rejects.toThrow('Ya existe una cuenta registrada con ese correo.');
  });

  it('da un mensaje propio solo si no hubo respuesta del backend', async () => {
    API.post.mockRejectedValue(new Error('Network Error'));

    await expect(
      registerUser({ nombre: 'Ana', email: 'ana@miumg.edu.gt', password: 'Becas2026' })
    ).rejects.toThrow('Error de conexión con el servidor');
  });
});

describe('loginUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia las credenciales a /auth/login y devuelve el token', async () => {
    API.post.mockResolvedValue({ data: { token: 'eyJhbGciOi...' } });

    const resultado = await loginUser({ email: 'ana@miumg.edu.gt', password: 'Becas2026' });

    expect(API.post).toHaveBeenCalledWith('/auth/login', {
      email: 'ana@miumg.edu.gt',
      password: 'Becas2026',
    });
    expect(resultado.token).toBe('eyJhbGciOi...');
  });

  it('propaga el mensaje unico de credenciales invalidas', async () => {
    // El backend responde lo MISMO para una contraseña incorrecta y para un
    // correo inexistente, a proposito: distinguirlos permitiria averiguar que
    // correos estan registrados. El cliente no debe "mejorar" ese mensaje.
    API.post.mockRejectedValue({ response: { data: { error: 'Credenciales inválidas.' } } });

    await expect(
      loginUser({ email: 'ana@miumg.edu.gt', password: 'equivocada' })
    ).rejects.toThrow('Credenciales inválidas.');
  });
});

describe('requestPasswordReset', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia el correo a /auth/forgot-password dentro de un objeto', async () => {
    API.post.mockResolvedValue({ data: { mensaje: 'Si el correo existe, se envió el enlace.' } });

    const resultado = await requestPasswordReset('ana@miumg.edu.gt');

    expect(API.post).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'ana@miumg.edu.gt',
    });
    expect(resultado.mensaje).toMatch(/enlace/i);
  });

  it('propaga el mensaje del backend si la peticion es rechazada', async () => {
    API.post.mockRejectedValue({ response: { data: { error: 'El correo es obligatorio.' } } });

    await expect(requestPasswordReset('')).rejects.toThrow('El correo es obligatorio.');
  });

  it('da un mensaje propio solo si no hubo respuesta', async () => {
    API.post.mockRejectedValue(new Error('Network Error'));

    await expect(requestPasswordReset('ana@miumg.edu.gt')).rejects.toThrow(
      'Error al solicitar la recuperación'
    );
  });
});
