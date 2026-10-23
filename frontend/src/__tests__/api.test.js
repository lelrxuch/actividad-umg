// Pruebas de src/services/api.js
//
// Lo que se prueba es la funcion que adjunta el token, no los internos de
// axios. `api.js` la exporta justamente para eso: alcanzar
// `API.interceptors.request.handlers[0]` desde una prueba la ataria a un
// detalle interno de la libreria que puede cambiar entre versiones.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import API, { agregarTokenDeSesion } from '../services/api';

describe('agregarTokenDeSesion', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adjunta el token guardado como Bearer', () => {
    localStorage.setItem('token', 'eyJtoken-de-prueba');

    const config = agregarTokenDeSesion({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer eyJtoken-de-prueba');
  });

  it('no adjunta nada cuando no hay sesion', () => {
    const config = agregarTokenDeSesion({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('no adjunta nada cuando el token guardado esta vacio', () => {
    localStorage.setItem('token', '');

    const config = agregarTokenDeSesion({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('devuelve la misma configuracion, con lo que ya traia intacto', () => {
    localStorage.setItem('token', 'abc');

    const config = agregarTokenDeSesion({
      headers: { 'Content-Type': 'application/json' },
      url: '/convocatorias',
    });

    expect(config.url).toBe('/convocatorias');
    expect(config.headers['Content-Type']).toBe('application/json');
    expect(config.headers.Authorization).toBe('Bearer abc');
  });

  it('funciona aunque la configuracion llegue sin cabeceras', () => {
    localStorage.setItem('token', 'abc');

    const config = agregarTokenDeSesion({});

    expect(config.headers.Authorization).toBe('Bearer abc');
  });

  describe('cuando localStorage no esta disponible', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('no revienta: la peticion sale sin token y el backend respondera 401', () => {
      // En modo privado, o con el almacenamiento del sitio bloqueado, leer
      // localStorage lanza. Si eso tumbara el interceptor, la aplicacion
      // quedaria sin poder hacer NINGUNA peticion, ni las publicas.
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError: acceso denegado al almacenamiento');
      });

      const config = agregarTokenDeSesion({ headers: {} });

      expect(config.headers.Authorization).toBeUndefined();
    });
  });
});

describe('la instancia de axios', () => {
  it('apunta a la API del backend', () => {
    expect(API.defaults.baseURL).toBe('http://localhost:4000/api');
  });
});
