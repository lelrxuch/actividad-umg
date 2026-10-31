// config/transaccion.js: BEGIN/COMMIT con una sola conexión, ROLLBACK si algo
// falla, y db() que dentro de la transacción devuelve su conexión.
//
// Se mockea el pool: lo que se prueba es el protocolo, no PostgreSQL. Que la
// transacción funcione contra la base real lo verifica demo-api.sh.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pool } from '../config/db.js';
import { conTransaccion, db } from '../config/transaccion.js';

vi.mock('../config/db.js', () => ({ pool: { connect: vi.fn(), query: vi.fn() } }));

let cliente;

beforeEach(() => {
  vi.clearAllMocks();
  cliente = { query: vi.fn(async () => ({ rows: [] })), release: vi.fn() };
  pool.connect.mockResolvedValue(cliente);
});

describe('conTransaccion', () => {
  it('abre la transacción, ejecuta el trabajo y la confirma', async () => {
    const resultado = await conTransaccion(async () => 'hecho');

    expect(resultado).toBe('hecho');
    expect(cliente.query.mock.calls.map((c) => c[0])).toEqual(['BEGIN', 'COMMIT']);
    expect(cliente.release).toHaveBeenCalledTimes(1);
  });

  it('si el trabajo falla, deshace todo, libera la conexión y deja pasar el error', async () => {
    await expect(
      conTransaccion(async () => {
        throw new Error('falló la segunda escritura');
      })
    ).rejects.toThrow('falló la segunda escritura');

    expect(cliente.query.mock.calls.map((c) => c[0])).toEqual(['BEGIN', 'ROLLBACK']);
    expect(cliente.release).toHaveBeenCalledTimes(1);
  });

  it('dentro de la transacción, db() es su conexión; fuera, el pool', async () => {
    let adentro;
    await conTransaccion(async () => {
      adentro = db();
    });

    expect(adentro).toBe(cliente);
    expect(db()).toBe(pool);
  });

  it('dos transacciones a la vez no se mezclan las conexiones', async () => {
    const clienteB = { query: vi.fn(async () => ({ rows: [] })), release: vi.fn() };
    pool.connect.mockResolvedValueOnce(cliente).mockResolvedValueOnce(clienteB);

    const vistos = await Promise.all([
      conTransaccion(async () => {
        await new Promise((r) => setTimeout(r, 5));
        return db();
      }),
      conTransaccion(async () => db()),
    ]);

    expect(vistos).toEqual([cliente, clienteB]);
  });
});
