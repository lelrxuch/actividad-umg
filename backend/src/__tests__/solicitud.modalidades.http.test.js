// Pruebas de la capa HTTP del catálogo de modalidades (SCRUM-41).
//
// Importan el controller y el service reales, sin mocks: lo que se verifica es
// que los valores que viajan al frontend son los mismos que las clases de
// modalidad declaran. Si alguien cambia 'nivel-medio' por 'nivel_medio' en una
// clase, estas pruebas caen.
import { describe, it, expect } from 'vitest';
import * as solicitudController from '../controllers/solicitud.controller.js';
import { SolicitudFactory } from '../patterns/creational/SolicitudFactory.js';

/** Doble de res que registra lo que el controller respondió. */
function resFalso() {
  return {
    statusCode: 200,
    cuerpo: undefined,
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
  };
}

describe('solicitud.controller — catálogo de modalidades (SCRUM-41)', () => {
  it('lista las tres modalidades registradas en el Factory', () => {
    const res = resFalso();
    solicitudController.listarTipos({}, res);

    expect(res.statusCode).toBe(200);
    // No se comparan literales inventados: la fuente de verdad es la fábrica.
    expect(res.cuerpo.tipos).toEqual(SolicitudFactory.tiposDisponibles());
    expect(res.cuerpo.tipos).toContain('nivel-medio');
    expect(res.cuerpo.tipos).toContain('universitaria');
    expect(res.cuerpo.tipos).toContain('posgrado');
  });

  it('cada modalidad listada responde su propia documentación', () => {
    for (const tipo of SolicitudFactory.tiposDisponibles()) {
      const res = resFalso();
      solicitudController.listarDocumentos({ params: { tipo } }, res);

      expect(res.statusCode).toBe(200);
      expect(res.cuerpo.tipo).toBe(tipo);
      expect(res.cuerpo.documentos).toEqual(
        SolicitudFactory.crearSolicitud(tipo).documentosRequeridos
      );
      expect(res.cuerpo.documentos.length).toBeGreaterThan(0);
    }
  });

  it('nivel-medio NO exige título: es el requisito que distingue la modalidad', () => {
    const res = resFalso();
    solicitudController.listarDocumentos({ params: { tipo: 'nivel-medio' } }, res);

    expect(res.cuerpo.documentos).not.toContain('titulo');
    expect(res.cuerpo.documentos).toContain('dni');
  });

  it('universitaria y posgrado sí exigen título', () => {
    for (const tipo of ['universitaria', 'posgrado']) {
      const res = resFalso();
      solicitudController.listarDocumentos({ params: { tipo } }, res);

      expect(res.cuerpo.documentos).toContain('titulo');
    }
  });

  it('una modalidad inexistente da 400, no 500', () => {
    const res = resFalso();
    solicitudController.listarDocumentos({ params: { tipo: 'beca-inventada' } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.cuerpo.error).toBeTruthy();
  });

  it('el 400 dice cuáles son los tipos válidos', () => {
    const res = resFalso();
    solicitudController.listarDocumentos({ params: { tipo: 'nivel_medio' } }, res);

    // Error frecuente: guion bajo en vez de guion. El mensaje tiene que
    // orientar al que integra, no solo rechazar.
    expect(res.cuerpo.error).toContain('nivel-medio');
  });

  it('no revienta si no viene el parámetro', () => {
    const res = resFalso();
    expect(() => solicitudController.listarDocumentos({ params: {} }, res)).not.toThrow();
    expect(res.statusCode).toBe(400);
  });
});
