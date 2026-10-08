import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as documentoRepository from '../repositories/documento.repository.js';
import * as documentoService from '../services/documento.service.js';
import * as identidadService from '../services/identidad.service.js';
import { RenapAdapter } from '../patterns/structural/RenapAdapter.js';
import { RenapClienteSimulado } from '../patterns/structural/RenapClienteSimulado.js';
import { AccesoDenegadoError } from '../patterns/structural/AccesoDenegadoError.js';
import { DocumentoProxy } from '../patterns/structural/DocumentoProxy.js';

// Se mockea solo la capa de datos: services y patrones se ejecutan de verdad.
vi.mock('../repositories/documento.repository.js', () => ({
  findById: vi.fn(),
  evaluadoresDeSolicitud: vi.fn(),
}));

const CUI_ANA = '1234567890101';
const DUENO = 7;
const EVALUADOR = 31;

const filaDocumento = {
  id: 500,
  solicitudId: 42,
  estudianteId: DUENO,
  tipo: 'dni',
  nombreArchivo: 'dpi-ana.pdf',
  rutaArchivo: '/expedientes/42/dpi-ana.pdf',
};

describe('identidad.service — integración del Adapter (SCRUM-31)', () => {
  it('valida un CUI real contra el registro', async () => {
    const identidad = await identidadService.validarIdentidad(CUI_ANA);

    expect(identidad).toMatchObject({ valido: true, cui: CUI_ANA, nombre: 'ANA MARIA LOPEZ GARCIA' });
  });

  it('propaga el 400 del adaptador cuando el CUI no existe', async () => {
    await expect(identidadService.validarIdentidad('9999999999999')).rejects.toMatchObject({
      status: 400,
    });
  });

  it('propaga el 503 del adaptador cuando el registro externo se cae', async () => {
    const validador = new RenapAdapter({
      cliente: new RenapClienteSimulado({ fallaCon: new Error('ECONNREFUSED') }),
    });

    await expect(identidadService.validarIdentidad(CUI_ANA, { validador })).rejects.toMatchObject({
      status: 503,
    });
  });

  it('acepta cualquier validador que cumpla la interfaz, no solo RENAP', async () => {
    const otroRegistro = new RenapAdapter({
      cliente: {
        consultarCiudadano: async () => ({
          codigoRespuesta: '00',
          mensaje: 'OK',
          datos: { primerNombre: 'OTRO', primerApellido: 'REGISTRO' },
        }),
      },
    });

    const identidad = await identidadService.validarIdentidad(CUI_ANA, { validador: otroRegistro });

    expect(identidad.nombre).toBe('OTRO REGISTRO');
  });

  it('rechaza un validador que no implemente la interfaz', async () => {
    await expect(
      identidadService.validarIdentidad(CUI_ANA, { validador: { validarCUI: () => {} } })
    ).rejects.toThrow(TypeError);
  });

  it('compara el nombre declarado ignorando acentos y mayúsculas', async () => {
    const coincide = await identidadService.validarIdentidadConNombre(
      CUI_ANA,
      '  aná  maría lópez garcía '
    );
    const noCoincide = await identidadService.validarIdentidadConNombre(CUI_ANA, 'Otro Nombre');

    expect(coincide.coincideNombre).toBe(true);
    expect(noCoincide.coincideNombre).toBe(false);
  });
});

describe('documento.service — integración del Proxy (SCRUM-31)', () => {
  let almacenamiento;

  beforeEach(() => {
    vi.clearAllMocks();
    almacenamiento = vi.fn().mockResolvedValue('%PDF-1.4');
    documentoRepository.findById.mockResolvedValue(filaDocumento);
    documentoRepository.evaluadoresDeSolicitud.mockResolvedValue([EVALUADOR]);
  });

  it('siempre entrega un proxy, nunca el documento real', async () => {
    const documento = await documentoService.obtenerDocumento(500, { id: DUENO, rol: 'estudiante' });

    expect(documento).toBeInstanceOf(DocumentoProxy);
  });

  it.each([
    ['el dueño', { id: DUENO, rol: 'estudiante' }],
    ['un evaluador asignado', { id: EVALUADOR, rol: 'evaluador' }],
    ['un administrador', { id: 999, rol: 'administrador' }],
  ])('deja descargar a %s', async (_caso, usuario) => {
    const descargado = await documentoService.descargarDocumento(500, usuario, { almacenamiento });

    expect(descargado.contenido).toBe('%PDF-1.4');
    expect(almacenamiento).toHaveBeenCalledOnce();
  });

  it('deniega con 403 a un estudiante ajeno y no lee el archivo', async () => {
    await expect(
      documentoService.descargarDocumento(500, { id: 8, rol: 'estudiante' }, { almacenamiento })
    ).rejects.toBeInstanceOf(AccesoDenegadoError);

    expect(almacenamiento).not.toHaveBeenCalled();
  });

  it('deniega a un evaluador que no está asignado a esa solicitud', async () => {
    documentoRepository.evaluadoresDeSolicitud.mockResolvedValue([99]);

    await expect(
      documentoService.descargarDocumento(500, { id: EVALUADOR, rol: 'evaluador' }, { almacenamiento })
    ).rejects.toMatchObject({ status: 403 });

    expect(almacenamiento).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el documento no existe, sin consultar evaluadores', async () => {
    documentoRepository.findById.mockResolvedValue(null);

    await expect(
      documentoService.descargarDocumento(404, { id: DUENO, rol: 'estudiante' })
    ).rejects.toMatchObject({ status: 404 });

    expect(documentoRepository.evaluadoresDeSolicitud).not.toHaveBeenCalled();
  });

  it('puedeDescargar informa el permiso sin leer el archivo', async () => {
    const permitido = await documentoService.puedeDescargar(500, { id: DUENO, rol: 'estudiante' });
    const denegado = await documentoService.puedeDescargar(500, { id: 8, rol: 'estudiante' });

    expect(permitido.puedeDescargar).toBe(true);
    expect(permitido.metadatos).toMatchObject({ id: 500, tipo: 'dni' });
    expect(denegado.puedeDescargar).toBe(false);
    expect(almacenamiento).not.toHaveBeenCalled();
  });

  it('resuelve los evaluadores de la solicitud del documento, no de otra', async () => {
    await documentoService.obtenerDocumento(500, { id: DUENO, rol: 'estudiante' });

    expect(documentoRepository.evaluadoresDeSolicitud).toHaveBeenCalledWith(42);
  });
});
