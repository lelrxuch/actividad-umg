import { describe, it, expect } from 'vitest';
import { SolicitudFactory } from '../../patterns/creational/SolicitudFactory.js';
import { SolicitudBeca } from '../../patterns/creational/SolicitudBeca.js';
import { ExpedienteBuilder } from '../../patterns/creational/ExpedienteBuilder.js';
import { ExpedienteIncompletoError } from '../../patterns/creational/ExpedienteIncompletoError.js';

const TITULO_DIVERSIFICADO = { nivel: 'diversificado', institucion: 'INEB' };
const TITULO_LICENCIATURA = { nivel: 'licenciatura', institucion: 'USAC' };
const CARTA = { autor: 'Director', contenido: 'Recomiendo al estudiante.' };

describe('Factory Method — SolicitudFactory (SCRUM-30)', () => {
  it('expone las tres modalidades registradas', () => {
    expect(SolicitudFactory.tiposDisponibles()).toEqual([
      'nivel-medio',
      'universitaria',
      'posgrado',
    ]);
  });

  it.each([
    ['nivel-medio', ['dni', 'carta'], null],
    ['universitaria', ['dni', 'titulo', 'carta'], 'diversificado'],
    ['posgrado', ['dni', 'titulo', 'carta'], 'licenciatura'],
  ])('crea %s con sus propios requisitos', (tipo, documentos, nivelTitulo) => {
    const solicitud = SolicitudFactory.crearSolicitud(tipo);

    expect(solicitud).toBeInstanceOf(SolicitudBeca);
    expect(solicitud.tipo).toBe(tipo);
    expect(solicitud.documentosRequeridos).toEqual(documentos);
    expect(solicitud.nivelTituloRequerido).toBe(nivelTitulo);
  });

  it('devuelve una clase concreta distinta por cada tipo', () => {
    const nombres = SolicitudFactory.tiposDisponibles().map(
      (tipo) => SolicitudFactory.crearSolicitud(tipo).constructor.name
    );

    expect(new Set(nombres).size).toBe(3);
  });

  it('devuelve instancias independientes en cada llamada', () => {
    const a = SolicitudFactory.crearSolicitud('posgrado');
    const b = SolicitudFactory.crearSolicitud('posgrado');

    expect(a).not.toBe(b);
  });

  it('rechaza una modalidad inexistente con status 400 y lista las válidas', () => {
    expect.assertions(2);
    try {
      SolicitudFactory.crearSolicitud('beca-inventada');
    } catch (error) {
      expect(error.status).toBe(400);
      expect(error.message).toContain('nivel-medio, universitaria, posgrado');
    }
  });
});

describe('Builder — ExpedienteBuilder (SCRUM-30)', () => {
  const builderPara = (tipo) =>
    new ExpedienteBuilder(SolicitudFactory.crearSolicitud(tipo));

  it('encadena los agregar* devolviendo siempre el mismo builder', () => {
    const builder = builderPara('universitaria');

    expect(builder.agregarDNI('1234567890101')).toBe(builder);
    expect(builder.agregarTitulo(TITULO_DIVERSIFICADO)).toBe(builder);
    expect(builder.agregarCarta(CARTA)).toBe(builder);
  });

  it('construye un expediente completo de nivel medio sin exigir título', () => {
    const expediente = builderPara('nivel-medio')
      .agregarDNI('1234567890101')
      .agregarCarta(CARTA)
      .build();

    expect(expediente.tipoBeca).toBe('nivel-medio');
    expect(expediente.documentos).toEqual(['dni', 'carta']);
    expect(expediente.detalle.dni.numero).toBe('1234567890101');
  });

  it('acepta los documentos en cualquier orden', () => {
    const expediente = builderPara('universitaria')
      .agregarCarta(CARTA)
      .agregarTitulo(TITULO_DIVERSIFICADO)
      .agregarDNI('1234567890101')
      .build();

    expect(expediente.documentos).toHaveLength(3);
  });

  it('devuelve un expediente inmutable', () => {
    const expediente = builderPara('nivel-medio')
      .agregarDNI('1234567890101')
      .agregarCarta(CARTA)
      .build();

    expect(() => {
      expediente.documentos = [];
    }).toThrow();
  });

  it('rechaza un expediente sin carta e informa exactamente qué falta', () => {
    expect.assertions(3);
    try {
      builderPara('universitaria')
        .agregarDNI('1234567890101')
        .agregarTitulo(TITULO_DIVERSIFICADO)
        .build();
    } catch (error) {
      expect(error).toBeInstanceOf(ExpedienteIncompletoError);
      expect(error.faltantes).toEqual(['carta']);
      expect(error.status).toBe(400);
    }
  });

  it('acumula todos los faltantes, no solo el primero', () => {
    expect.assertions(1);
    try {
      builderPara('posgrado').agregarDNI('1234567890101').build();
    } catch (error) {
      expect(error.faltantes).toEqual(['titulo', 'carta']);
    }
  });

  it('rechaza un expediente de posgrado con título de diversificado', () => {
    expect.assertions(1);
    try {
      builderPara('posgrado')
        .agregarDNI('1234567890101')
        .agregarTitulo(TITULO_DIVERSIFICADO)
        .agregarCarta(CARTA)
        .build();
    } catch (error) {
      expect(error.faltantes).toEqual(['titulo de nivel licenciatura']);
    }
  });

  it('acepta el mismo expediente cuando el título sí es de licenciatura', () => {
    const expediente = builderPara('posgrado')
      .agregarDNI('1234567890101')
      .agregarTitulo(TITULO_LICENCIATURA)
      .agregarCarta(CARTA)
      .build();

    expect(expediente.detalle.titulo.nivel).toBe('licenciatura');
  });

  it('no construye nada si no se llamó a build()', () => {
    const builder = builderPara('nivel-medio').agregarDNI('1234567890101');

    expect(builder.expediente).toBeUndefined();
  });

  it('exige un tipo de beca creado por la factory', () => {
    expect(() => new ExpedienteBuilder('universitaria')).toThrow(TypeError);
    expect(() => new ExpedienteBuilder({ documentosRequeridos: [] })).toThrow(TypeError);
  });
});
