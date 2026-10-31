// config/db.js: cuándo la conexión a PostgreSQL usa SSL.
import { describe, it, expect } from 'vitest';
import { opcionesSsl } from '../config/db.js';

describe('opcionesSsl', () => {
  it('con DB_SSL=true verifica el certificado del servidor (Azure)', () => {
    expect(opcionesSsl({ DB_SSL: 'true' })).toEqual({ rejectUnauthorized: true });
  });

  it.each([[undefined], ['false'], ['TRUE'], ['1']])('con DB_SSL=%s no usa SSL (base local)', (valor) => {
    expect(opcionesSsl({ DB_SSL: valor })).toBe(false);
  });
});
