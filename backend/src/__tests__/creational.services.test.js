import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as solicitudRepository from '../repositories/solicitud.repository.js';
import * as solicitudService from '../services/solicitud.service.js';
import * as expedienteService from '../services/expediente.service.js';

// Se mockea solo la capa de datos: services y patrones se ejecutan de verdad.
vi.mock('../repositories/solicitud.repository.js', () => ({
  findById: vi.fn(),
  crear: vi.fn(),
  actualizarEstado: vi.fn(),
}));

const TITULO_DIVERSIFICADO = { nivel: 'diversificado', institucion: 'INEB' };
const CARTA = { autor: 'Director', contenido: 'Recomiendo al estudiante.' };

describe('solicitud.service — integración del Factory Method (SCRUM-30)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    solicitudRepository.crear.mockResolvedValue({ id: 99, estudiante_id: 42, estado: 'Borrador' });
  });

  it('crea la solicitud con el estado inicial del State y los requisitos del Factory', async () => {
    const creada = await solicitudService.crearSolicitud(42, 'universitaria');

    expect(creada).toMatchObject({
      id: 99,
      estado: 'Borrador',
      tipo: 'universitaria',
      documentosRequeridos: ['dni', 'titulo', 'carta'],
      nivelTituloRequerido: 'diversificado',
    });
    expect(solicitudRepository.crear).toHaveBeenCalledWith(42, 'Borrador');
  });

  it('devuelve requisitos distintos según la modalidad', async () => {
    const medio = await solicitudService.crearSolicitud(1, 'nivel-medio');
    const posgrado = await solicitudService.crearSolicitud(1, 'posgrado');

    expect(medio.documentosRequeridos).not.toEqual(posgrado.documentosRequeridos);
    expect(medio.nivelTituloRequerido).toBeNull();
    expect(posgrado.nivelTituloRequerido).toBe('licenciatura');
  });

  it('valida la modalidad ANTES de escribir en base de datos', async () => {
    await expect(solicitudService.crearSolicitud(1, 'beca-inventada')).rejects.toMatchObject({
      status: 400,
    });

    expect(solicitudRepository.crear).not.toHaveBeenCalled();
  });

  it('exige la modalidad: sin tipo no se crea nada', async () => {
    await expect(solicitudService.crearSolicitud(1)).rejects.toThrow(/Tipo de beca desconocido/);
    expect(solicitudRepository.crear).not.toHaveBeenCalled();
  });

  it('expone las modalidades y los requisitos sin iniciar una solicitud', () => {
    expect(solicitudService.tiposDeBeca()).toContain('posgrado');
    expect(solicitudService.documentosRequeridos('nivel-medio')).toEqual(['dni', 'carta']);
    expect(solicitudRepository.crear).not.toHaveBeenCalled();
  });
});

describe('expediente.service — integración del Builder (SCRUM-30)', () => {
  it('arma el expediente completo de una beca universitaria', () => {
    const expediente = expedienteService.armarExpediente('universitaria', {
      dni: '1234567890101',
      titulo: TITULO_DIVERSIFICADO,
      carta: CARTA,
    });

    expect(expediente.tipoBeca).toBe('universitaria');
    expect(expediente.documentos).toEqual(['dni', 'titulo', 'carta']);
  });

  it('falla cuando faltan documentos, indicando cuáles', () => {
    expect.assertions(2);
    try {
      expedienteService.armarExpediente('universitaria', { dni: '1234567890101' });
    } catch (error) {
      expect(error.status).toBe(400);
      expect(error.faltantes).toEqual(['titulo', 'carta']);
    }
  });

  it('no exige título para nivel medio', () => {
    const expediente = expedienteService.armarExpediente('nivel-medio', {
      dni: '1234567890101',
      carta: CARTA,
    });

    expect(expediente.documentos).toEqual(['dni', 'carta']);
  });

  it('revisarExpediente informa el progreso sin lanzar', () => {
    expect(expedienteService.revisarExpediente('posgrado', { dni: '1234567890101' })).toEqual({
      completo: false,
      faltantes: ['titulo', 'carta'],
    });

    expect(
      expedienteService.revisarExpediente('nivel-medio', {
        dni: '1234567890101',
        carta: CARTA,
      })
    ).toEqual({ completo: true, faltantes: [] });
  });

  it('revisarExpediente sí propaga un error que no sea de expediente incompleto', () => {
    expect(() => expedienteService.revisarExpediente('beca-inventada', {})).toThrow(
      /Tipo de beca desconocido/
    );
  });
});
