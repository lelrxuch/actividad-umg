// Pruebas de src/utils/fechas.js
//
// Estas SI importan el codigo de produccion. Si se rompe `fechas.js`, estas
// pruebas fallan: es la diferencia con los dos archivos de prueba que el
// frontend tenia antes, que solo comparaban literales escritos dentro de la
// propia prueba y no podian fallar nunca.
//
// El momento de referencia se inyecta en cada caso. Una prueba que dependa de
// `new Date()` real deja de pasar sola con el tiempo.
import { describe, it, expect } from 'vitest';
import { diasHasta, formatearFecha, periodo } from '../utils/fechas';

/** 22 de octubre de 2026, a media tarde en Guatemala (UTC-6). */
const HOY = new Date('2026-10-22T20:00:00Z');

describe('diasHasta', () => {
  it('cuenta los dias de calendario hasta una fecha futura', () => {
    expect(diasHasta('2026-10-24', HOY)).toBe(2);
    expect(diasHasta('2026-11-15', HOY)).toBe(24);
  });

  it('devuelve 0 cuando la fecha es hoy', () => {
    expect(diasHasta('2026-10-22', HOY)).toBe(0);
  });

  it('devuelve negativo cuando la fecha ya paso', () => {
    expect(diasHasta('2026-10-20', HOY)).toBe(-2);
  });

  it('no se desplaza un dia por la zona horaria', () => {
    // Este es el caso que motiva comparar en UTC. A las 23:30 en Guatemala ya
    // es el dia siguiente en UTC; si se mezclaran los dos calendarios, el
    // conteo saldria corrido en uno.
    const casiMedianocheEnGuatemala = new Date('2026-10-23T05:30:00Z');

    expect(diasHasta('2026-10-23', casiMedianocheEnGuatemala)).toBe(0);
    expect(diasHasta('2026-10-24', casiMedianocheEnGuatemala)).toBe(1);
  });

  it('devuelve null cuando la fecha no se puede interpretar', () => {
    expect(diasHasta('15/11/2026', HOY)).toBeNull();
    expect(diasHasta('', HOY)).toBeNull();
    expect(diasHasta(null, HOY)).toBeNull();
    expect(diasHasta(undefined, HOY)).toBeNull();
  });
});

describe('formatearFecha', () => {
  it('escribe la fecha en español', () => {
    expect(formatearFecha('2026-11-15')).toBe('15 de noviembre de 2026');
    expect(formatearFecha('2026-01-01')).toBe('1 de enero de 2026');
    expect(formatearFecha('2026-12-31')).toBe('31 de diciembre de 2026');
  });

  it('no corre la fecha un dia', () => {
    // `new Date('2026-11-15').getDate()` devuelve 14 en Guatemala. Por eso el
    // formateo tambien lee la fecha en UTC.
    expect(formatearFecha('2026-11-15')).toContain('15');
  });

  it('devuelve cadena vacia si la fecha no sirve', () => {
    expect(formatearFecha('ayer')).toBe('');
    expect(formatearFecha(undefined)).toBe('');
  });
});

describe('periodo', () => {
  it('una convocatoria vigente informa los dias que faltan para cerrar', () => {
    const r = periodo({ fechaApertura: '2026-10-01', fechaCierre: '2026-11-15' }, HOY);

    expect(r.fase).toBe('abierta');
    expect(r.dias).toBe(24);
    expect(r.etiqueta).toBe('Cierran en 24 días');
  });

  it('distingue el ultimo dia', () => {
    const r = periodo({ fechaApertura: '2026-10-01', fechaCierre: '2026-10-22' }, HOY);

    expect(r.fase).toBe('abierta');
    expect(r.etiqueta).toBe('Cierra hoy');
  });

  it('usa singular cuando falta un solo dia', () => {
    expect(periodo({ fechaApertura: '2026-10-01', fechaCierre: '2026-10-23' }, HOY).etiqueta)
      .toBe('Cierra mañana');
    expect(periodo({ fechaApertura: '2026-10-23', fechaCierre: '2026-12-01' }, HOY).etiqueta)
      .toBe('Abre mañana');
  });

  it('una convocatoria publicada que todavia no abre se marca por-abrir', () => {
    const r = periodo({ fechaApertura: '2026-11-01', fechaCierre: '2026-12-20' }, HOY);

    expect(r.fase).toBe('por-abrir');
    expect(r.dias).toBe(10);
    expect(r.etiqueta).toBe('Abre en 10 días');
  });

  it('una convocatoria cuyo plazo ya paso se marca vencida', () => {
    const r = periodo({ fechaApertura: '2026-08-01', fechaCierre: '2026-09-30' }, HOY);

    expect(r.fase).toBe('vencida');
    expect(r.etiqueta).toBe('Periodo vencido');
  });

  it('aguanta una convocatoria sin fechas', () => {
    expect(periodo({}, HOY).fase).toBe('sin-fechas');
    expect(periodo(null, HOY).fase).toBe('sin-fechas');
  });

  it('aguanta una convocatoria sin fecha de cierre', () => {
    const r = periodo({ fechaApertura: '2026-10-01', fechaCierre: null }, HOY);

    expect(r.fase).toBe('abierta');
    expect(r.etiqueta).toBe('Abierta, sin fecha de cierre');
  });
});
