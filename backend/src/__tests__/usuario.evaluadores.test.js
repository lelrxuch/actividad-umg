// GET /api/usuarios/evaluadores — la lista que el administrador usa para
// asignar evaluadores (POST /api/solicitudes/:id/evaluadores).
//
// Las peticiones recorren la ruta real: el middleware `autenticado` con un JWT
// firmado de verdad y luego el controller. Solo se mockea la base de datos.
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import * as usuarioRepo from '../repositories/usuario.repository.js';
import router from '../routes/usuario.routes.js';

vi.mock('../repositories/usuario.repository.js', () => ({
  listarPorRol: vi.fn(),
}));

const SECRETO = 'secreto-de-prueba';

beforeAll(() => {
  process.env.JWT_SECRET = SECRETO;
});

beforeEach(() => {
  vi.clearAllMocks();
  usuarioRepo.listarPorRol.mockResolvedValue([]);
});

/** Token como el que firma auth.service: el id va en `sub`. */
function tokenDe(rol, id = 1) {
  return jwt.sign({ sub: id, email: `${rol}@mineduc.gob.gt`, rol }, SECRETO);
}

function resFalso() {
  return {
    statusCode: 200,
    cuerpo: undefined,
    status(c) { this.statusCode = c; return this; },
    json(c) { this.cuerpo = c; return this; },
  };
}

/** Corre los handlers de GET /evaluadores en orden, como lo haría Express. */
async function pedir(token) {
  const capa = router.stack.find((c) => c.route?.path === '/evaluadores' && c.route.methods.get);
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {}, params: {}, body: {} };
  const res = resFalso();

  for (const { handle } of capa.route.stack) {
    let siguio = false;
    await handle(req, res, () => { siguio = true; });
    if (!siguio) break;
  }
  return res;
}

describe('GET /api/usuarios/evaluadores — administrador', () => {
  it('sin evaluadores: 200 con arreglo vacío', async () => {
    const res = await pedir(tokenDe('administrador'));

    expect(res.statusCode).toBe(200);
    expect(res.cuerpo).toEqual([]);
    expect(usuarioRepo.listarPorRol).toHaveBeenCalledWith('evaluador');
  });

  it('con varios: [{ id, nombre, email }] en el orden del repositorio (por nombre)', async () => {
    usuarioRepo.listarPorRol.mockResolvedValue([
      { id: 8, nombre: 'Ana Ramírez', email: 'ana@mineduc.gob.gt' },
      { id: 3, nombre: 'Luis Pérez', email: 'luis@mineduc.gob.gt' },
    ]);

    const res = await pedir(tokenDe('administrador'));

    expect(res.statusCode).toBe(200);
    expect(res.cuerpo).toEqual([
      { id: 8, nombre: 'Ana Ramírez', email: 'ana@mineduc.gob.gt' },
      { id: 3, nombre: 'Luis Pérez', email: 'luis@mineduc.gob.gt' },
    ]);
  });

  it('nunca devuelve password_hash ni otras columnas, aunque la consulta las traiga', async () => {
    // Si alguien cambia la consulta por un SELECT *, esto tiene que caer.
    usuarioRepo.listarPorRol.mockResolvedValue([
      {
        id: 8,
        nombre: 'Ana Ramírez',
        email: 'ana@mineduc.gob.gt',
        password_hash: '$2a$10$hashquenodebesalir',
        rol: 'evaluador',
        reset_token_hash: 'abc',
        telefono: '55555555',
      },
    ]);

    const res = await pedir(tokenDe('administrador'));

    expect(JSON.stringify(res.cuerpo)).not.toMatch(/password_hash|hashquenodebesalir|reset_token/);
    expect(Object.keys(res.cuerpo[0]).sort()).toEqual(['email', 'id', 'nombre']);
  });
});

describe('GET /api/usuarios/evaluadores — sin permiso', () => {
  it.each([
    ['un estudiante', 'estudiante'],
    ['un evaluador', 'evaluador'],
  ])('%s recibe 403 y no se consulta la base', async (_caso, rol) => {
    const res = await pedir(tokenDe(rol, 5));

    expect(res.statusCode).toBe(403);
    expect(res.cuerpo.error).toMatch(/administrador/i);
    expect(usuarioRepo.listarPorRol).not.toHaveBeenCalled();
  });

  it('sin sesión: 401', async () => {
    const res = await pedir(null);

    expect(res.statusCode).toBe(401);
    expect(usuarioRepo.listarPorRol).not.toHaveBeenCalled();
  });

  it('con un token falsificado: 401', async () => {
    const falso = jwt.sign({ sub: 1, rol: 'administrador' }, 'otro-secreto');

    const res = await pedir(falso);

    expect(res.statusCode).toBe(401);
    expect(usuarioRepo.listarPorRol).not.toHaveBeenCalled();
  });

  it('si la base falla: 500 sin el mensaje de PostgreSQL', async () => {
    usuarioRepo.listarPorRol.mockRejectedValue(new Error('relation "usuarios" does not exist'));

    const res = await pedir(tokenDe('administrador'));

    expect(res.statusCode).toBe(500);
    expect(res.cuerpo.error).not.toMatch(/relation|usuarios/);
  });
});

describe('la ruta y la consulta', () => {
  it("'/evaluadores' está registrada antes de cualquier ruta con '/:id'", () => {
    const rutas = router.stack.filter((c) => c.route).map((c) => c.route.path);
    const primeraConId = rutas.findIndex((r) => r.includes('/:id'));

    expect(rutas).toContain('/evaluadores');
    expect(rutas.indexOf('/evaluadores')).toBeLessThan(primeraConId);
  });

  it('la consulta nombra sus columnas, filtra por rol y ordena por nombre', async () => {
    // Esta suite no levanta PostgreSQL: se lee el SQL. La verificación contra la
    // base real está en scripts/demo-api.sh.
    const fs = await import('node:fs/promises');
    const url = await import('node:url');
    const fuente = await fs.readFile(
      url.fileURLToPath(new URL('../repositories/usuario.repository.js', import.meta.url)),
      'utf8'
    );
    const desde = fuente.indexOf('export async function listarPorRol');
    const sql = fuente.slice(desde, fuente.indexOf('\n}', desde));

    expect(sql).toMatch(/SELECT id, nombre, email FROM usuarios/);
    expect(sql).not.toMatch(/SELECT \*/);
    expect(sql).toMatch(/WHERE rol = \$1/);
    expect(sql).toMatch(/ORDER BY nombre ASC/);
  });
});
