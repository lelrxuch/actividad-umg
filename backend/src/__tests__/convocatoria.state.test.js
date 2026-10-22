// Patrón State de la Convocatoria (SCRUM-32, SCRUM-33).
//
// Se prueba el ciclo de vida sin tocar base de datos: las clases de estado son
// dominio puro. Lo que importa no es que las transiciones válidas funcionen,
// sino que las inválidas estén prohibidas POR OMISIÓN — es la propiedad que
// hace que agregar un estado nuevo no abra un agujero.
import { describe, it, expect } from 'vitest';
import {
  Convocatoria,
  EstadoBorradorConvocatoria,
  EstadoPublicada,
  EstadoCerrada,
  IEstadoConvocatoria,
  crearEstadoDesdeNombre,
  nombresDeEstado,
} from '../patterns/state/convocatoria/index.js';
import { TransicionInvalidaError } from '../patterns/state/index.js';

/** Una convocatoria completa, lista para publicarse. */
function completa(estado) {
  return new Convocatoria({
    id: 1,
    titulo: 'Becas Nacionales 2027',
    modalidades: ['universitaria', 'posgrado'],
    fechaApertura: '2027-01-01',
    fechaCierre: '2027-03-31',
    ...(estado ? { estado } : {}),
  });
}

describe('Convocatoria — el camino válido', () => {
  it('nace en Borrador sin que nadie se lo diga', () => {
    expect(completa().nombreEstado).toBe('Borrador');
  });

  it('Borrador → Publicada → Cerrada', () => {
    const c = completa();

    c.publicar();
    expect(c.nombreEstado).toBe('Publicada');

    c.cerrar();
    expect(c.nombreEstado).toBe('Cerrada');
  });
});

describe('Convocatoria — lo que cada estado responde', () => {
  it('Borrador se edita pero no admite solicitudes', () => {
    const c = completa();
    expect(c.admiteEdicion).toBe(true);
    expect(c.admiteSolicitudes).toBe(false);
    expect(c.accionesPermitidas).toEqual(['editar', 'publicar']);
  });

  it('Publicada admite solicitudes y NO se edita', () => {
    const c = completa(new EstadoPublicada());
    // Editar una convocatoria abierta le movería el piso a quien ya aplicó.
    expect(c.admiteEdicion).toBe(false);
    expect(c.admiteSolicitudes).toBe(true);
    expect(c.accionesPermitidas).toEqual(['cerrar']);
  });

  it('Cerrada no admite nada: es estado final', () => {
    const c = completa(new EstadoCerrada());
    expect(c.admiteEdicion).toBe(false);
    expect(c.admiteSolicitudes).toBe(false);
    expect(c.accionesPermitidas).toEqual([]);
  });
});

describe('Convocatoria — las transiciones inválidas están prohibidas por omisión', () => {
  it('no se publica dos veces', () => {
    const c = completa(new EstadoPublicada());
    expect(() => c.publicar()).toThrow(TransicionInvalidaError);
  });

  it('no se cierra un borrador: primero se publica', () => {
    expect(() => completa().cerrar()).toThrow(TransicionInvalidaError);
  });

  it('una cerrada no se reabre ni se vuelve a cerrar', () => {
    const c = completa(new EstadoCerrada());
    expect(() => c.publicar()).toThrow(TransicionInvalidaError);
    expect(() => c.cerrar()).toThrow(TransicionInvalidaError);
  });

  it('el error lleva status 409 y dice qué sí se puede', () => {
    try {
      completa().cerrar();
      throw new Error('debió lanzar');
    } catch (error) {
      expect(error.status).toBe(409);
      expect(error.message).toContain('Borrador');
      expect(error.message).toContain('publicar');
    }
  });

  it('una transición rechazada no cambia el estado', () => {
    const c = completa();
    expect(() => c.cerrar()).toThrow();
    expect(c.nombreEstado).toBe('Borrador');
  });
});

describe('Convocatoria — la ventana de fechas', () => {
  const c = completa();

  it('dentro del periodo', () => {
    expect(c.estaEnVentana(new Date('2027-02-15'))).toBe(true);
  });

  it('los extremos cuentan como dentro', () => {
    expect(c.estaEnVentana(new Date('2027-01-01'))).toBe(true);
    expect(c.estaEnVentana(new Date('2027-03-31'))).toBe(true);
  });

  it('antes de abrir y después de cerrar, fuera', () => {
    expect(c.estaEnVentana(new Date('2026-12-31'))).toBe(false);
    expect(c.estaEnVentana(new Date('2027-04-01'))).toBe(false);
  });

  it('sin fechas, siempre dentro: el administrador decidió no acotarla', () => {
    const sinFechas = new Convocatoria({ titulo: 'X', modalidades: ['posgrado'] });
    expect(sinFechas.estaEnVentana(new Date('1999-01-01'))).toBe(true);
  });
});

describe('Convocatoria — las modalidades que admite', () => {
  it('admite las declaradas y rechaza el resto', () => {
    const c = completa();
    expect(c.admiteModalidad('universitaria')).toBe(true);
    expect(c.admiteModalidad('posgrado')).toBe(true);
    expect(c.admiteModalidad('nivel-medio')).toBe(false);
  });

  it('sin modalidades no admite ninguna, no todas', () => {
    // Si una convocatoria sin modalidades admitiera todo, publicarla vacía
    // dejaría entrar cualquier beca. Es más seguro rechazar.
    const vacia = new Convocatoria({ titulo: 'X' });
    expect(vacia.admiteModalidad('universitaria')).toBe(false);
  });
});

describe('Convocatoria — el mapa de estados', () => {
  it('los nombres coinciden con el CHECK de la tabla', () => {
    expect(nombresDeEstado()).toEqual(['Borrador', 'Publicada', 'Cerrada']);
  });

  it('reconstruye el estado desde el texto guardado', () => {
    expect(crearEstadoDesdeNombre('Publicada')).toBeInstanceOf(EstadoPublicada);
    expect(crearEstadoDesdeNombre('Borrador')).toBeInstanceOf(EstadoBorradorConvocatoria);
    expect(crearEstadoDesdeNombre('Cerrada')).toBeInstanceOf(EstadoCerrada);
  });

  it('un nombre desconocido falla con los válidos en el mensaje', () => {
    expect(() => crearEstadoDesdeNombre('publicada')).toThrow(/Borrador, Publicada, Cerrada/);
  });

  it('todos los estados implementan la interfaz', () => {
    for (const nombre of nombresDeEstado()) {
      expect(crearEstadoDesdeNombre(nombre)).toBeInstanceOf(IEstadoConvocatoria);
    }
  });

  it('no se puede meter un estado que no sea del patrón', () => {
    expect(() => new Convocatoria({ estado: 'Publicada' })).toThrow(TypeError);
    expect(() => completa().cambiarEstado({ nombre: 'Publicada' })).toThrow(TypeError);
  });
});
