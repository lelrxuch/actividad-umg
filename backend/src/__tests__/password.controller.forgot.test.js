// POST /api/auth/forgot-password no puede devolver el token de recuperación.
//
// Hasta esta corrección respondía `tokenDebug` siempre que NODE_ENV no fuera
// 'production', que es el valor por defecto. Con eso cualquiera cambiaba la
// contraseña de cualquier cuenta conociendo solo el correo; y como el token
// solo salía si la cuenta existía, también revelaba qué correos están
// registrados. Se probó y funcionaba.
//
// Controller y service son los reales; solo se mockea la base de datos. El
// token se captura de la consola del servidor (el único lugar donde puede
// aparecer, y solo fuera de producción) para buscarlo en la respuesta.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as usuarioRepo from '../repositories/usuario.repository.js';
import { forgotPassword, RESPUESTA_RECUPERACION } from '../controllers/password.controller.js';

vi.mock('../repositories/usuario.repository.js', () => ({
  findByEmail: vi.fn(),
  saveResetToken: vi.fn(),
  findByResetTokenHash: vi.fn(),
  updatePasswordAndClearToken: vi.fn(),
}));

const NODE_ENV_ORIGINAL = process.env.NODE_ENV;

function resFalso() {
  return {
    statusCode: 200,
    cuerpo: undefined,
    status(c) { this.statusCode = c; return this; },
    json(c) { this.cuerpo = c; return this; },
  };
}

/** Pide la recuperación y devuelve la respuesta y el token, si se generó. */
async function pedirRecuperacion(email) {
  const consola = vi.spyOn(console, 'log').mockImplementation(() => {});
  const res = resFalso();

  await forgotPassword({ body: { email } }, res);

  const lineas = consola.mock.calls.map((args) => args.join(' ')).join('\n');
  consola.mockRestore();
  const token = /([0-9a-f]{64})/.exec(lineas)?.[1] ?? null;
  return { res, token, lineas };
}

beforeEach(() => {
  vi.clearAllMocks();
  usuarioRepo.saveResetToken.mockResolvedValue(undefined);
  usuarioRepo.findByEmail.mockImplementation(async (email) =>
    email === 'existe@miumg.edu.gt' ? { id: 1, email } : null
  );
});

afterEach(() => {
  if (NODE_ENV_ORIGINAL === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = NODE_ENV_ORIGINAL;
});

describe.each([
  ['sin NODE_ENV (el valor por defecto)', undefined],
  ['NODE_ENV=development', 'development'],
  ['NODE_ENV=test', 'test'],
  ['NODE_ENV=production', 'production'],
])('forgot-password con %s', (_caso, entorno) => {
  beforeEach(() => {
    if (entorno === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = entorno;
  });

  it('el token NO aparece en la respuesta', async () => {
    const { res, token } = await pedirRecuperacion('existe@miumg.edu.gt');

    // Se generó y se guardó uno de verdad: la prueba no pasa por no haberlo creado.
    expect(usuarioRepo.saveResetToken).toHaveBeenCalledOnce();
    expect(res.cuerpo).not.toHaveProperty('tokenDebug');
    expect(res.cuerpo).not.toHaveProperty('token');
    if (token) expect(JSON.stringify(res.cuerpo)).not.toContain(token);
    expect(JSON.stringify(res.cuerpo)).not.toMatch(/[0-9a-f]{32,}/);
  });

  it('la respuesta es idéntica exista o no la cuenta', async () => {
    const existe = await pedirRecuperacion('existe@miumg.edu.gt');
    const noExiste = await pedirRecuperacion('nadie@miumg.edu.gt');

    expect(existe.res.statusCode).toBe(200);
    expect(noExiste.res.statusCode).toBe(200);
    expect(existe.res.cuerpo).toEqual(noExiste.res.cuerpo);
    expect(existe.res.cuerpo).toEqual(RESPUESTA_RECUPERACION);
  });
});

describe('forgot-password — el token en la consola del servidor', () => {
  it('fuera de producción sale en consola, para probar en local', async () => {
    process.env.NODE_ENV = 'development';

    const { token } = await pedirRecuperacion('existe@miumg.edu.gt');

    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('en producción tampoco sale en consola: los logs también se leen', async () => {
    process.env.NODE_ENV = 'production';

    const { token, lineas } = await pedirRecuperacion('existe@miumg.edu.gt');

    expect(token).toBeNull();
    expect(lineas).not.toMatch(/token/i);
  });
});
