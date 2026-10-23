// Pruebas de src/services/convocatoriaService.js
//
// Se mockea `api.js`, que es el cliente de axios, y NO el service que se esta
// probando. Mockear lo que se prueba produce una prueba que no puede fallar.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import API from '../services/api';
import { listarConvocatorias, obtenerConvocatoria } from '../services/convocatoriaService';

vi.mock('../services/api', () => ({
  default: { get: vi.fn() },
}));

describe('listarConvocatorias', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pide /convocatorias y devuelve el arreglo que trae la respuesta', async () => {
    API.get.mockResolvedValue({
      data: { convocatorias: [{ id: 1, titulo: 'Beca Universitaria' }] },
    });

    const resultado = await listarConvocatorias();

    expect(API.get).toHaveBeenCalledWith('/convocatorias');
    expect(resultado).toEqual([{ id: 1, titulo: 'Beca Universitaria' }]);
  });

  it('devuelve siempre un arreglo, aunque el backend no mande la llave', async () => {
    // La pantalla recorre el resultado con .map y pregunta .length: si el
    // service le pasara el objeto de la respuesta, la pantalla reventaria.
    API.get.mockResolvedValue({ data: {} });

    const resultado = await listarConvocatorias();

    expect(Array.isArray(resultado)).toBe(true);
    expect(resultado).toEqual([]);
  });

  it('devuelve un arreglo vacio si no hay convocatorias publicadas', async () => {
    API.get.mockResolvedValue({ data: { convocatorias: [] } });

    expect(await listarConvocatorias()).toEqual([]);
  });

  it('propaga el mensaje que escribio el backend, sin reescribirlo', async () => {
    API.get.mockRejectedValue({
      response: { data: { error: 'La convocatoria 9 está en "Borrador" y no admite solicitudes.' } },
    });

    await expect(listarConvocatorias()).rejects.toThrow(
      'La convocatoria 9 está en "Borrador" y no admite solicitudes.'
    );
  });

  it('da un mensaje propio solo cuando el backend no manda ninguno', async () => {
    // Red caida: no hay respuesta, asi que no hay mensaje del backend.
    API.get.mockRejectedValue(new Error('Network Error'));

    await expect(listarConvocatorias()).rejects.toThrow('No se pudieron cargar las convocatorias');
  });
});

describe('obtenerConvocatoria', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pide la convocatoria por su identificador', async () => {
    API.get.mockResolvedValue({ data: { id: 7, titulo: 'Beca de Posgrado' } });

    const resultado = await obtenerConvocatoria(7);

    expect(API.get).toHaveBeenCalledWith('/convocatorias/7');
    expect(resultado).toEqual({ id: 7, titulo: 'Beca de Posgrado' });
  });

  it('propaga el mensaje del backend cuando no existe', async () => {
    API.get.mockRejectedValue({ response: { data: { error: 'No existe la convocatoria 99.' } } });

    await expect(obtenerConvocatoria(99)).rejects.toThrow('No existe la convocatoria 99.');
  });
});
