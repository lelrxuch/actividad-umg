import { describe, it, expect, vi } from 'vitest';
import { RenapAdapter } from '../../patterns/structural/RenapAdapter.js';
import { RenapClienteSimulado } from '../../patterns/structural/RenapClienteSimulado.js';
import { IValidacionIdentidad } from '../../patterns/structural/IValidacionIdentidad.js';
import {
  IdentidadNoValidaError,
  ServicioIdentidadNoDisponibleError,
} from '../../patterns/structural/ErroresIdentidad.js';
import { DocumentoProxy } from '../../patterns/structural/DocumentoProxy.js';
import { DocumentoReal } from '../../patterns/structural/DocumentoReal.js';
import { IDocumento } from '../../patterns/structural/IDocumento.js';
import { AccesoDenegadoError } from '../../patterns/structural/AccesoDenegadoError.js';

const CUI_ANA = '1234567890101';

describe('Adapter — RenapAdapter (SCRUM-31)', () => {
  it('implementa la interfaz que espera el dominio', () => {
    expect(new RenapAdapter()).toBeInstanceOf(IValidacionIdentidad);
  });

  it('traduce la respuesta de RENAP a la forma del dominio', async () => {
    const identidad = await new RenapAdapter().validarCUI(CUI_ANA);

    // RENAP devuelve el nombre en cuatro campos y la fecha como 'DD/MM/AAAA'.
    expect(identidad).toEqual({
      valido: true,
      cui: CUI_ANA,
      nombre: 'ANA MARIA LOPEZ GARCIA',
      fechaNacimiento: new Date(2001, 2, 15),
    });
  });

  it('omite los campos de nombre vacíos en lugar de dejar dobles espacios', async () => {
    const identidad = await new RenapAdapter().validarCUI('2345678901202');

    expect(identidad.nombre).toBe('CARLOS PEREZ');
  });

  it('traduce la entrada: limpia guiones y espacios antes de consultar', async () => {
    const cliente = new RenapClienteSimulado();

    await new RenapAdapter({ cliente }).validarCUI(' 1234-5678-90101 ');

    expect(cliente.consultas).toEqual([CUI_ANA]);
  });

  it.each([
    ['123', 'demasiado corto'],
    ['12345678901234', 'demasiado largo'],
    ['123456789010A', 'contiene una letra'],
    ['', 'vacío'],
    [null, 'ausente'],
  ])('rechaza el CUI %j porque es %s', async (cui) => {
    const cliente = new RenapClienteSimulado();

    await expect(new RenapAdapter({ cliente }).validarCUI(cui)).rejects.toBeInstanceOf(
      IdentidadNoValidaError
    );

    // Un CUI mal formado no debe gastar una llamada al servicio externo.
    expect(cliente.consultas).toEqual([]);
  });

  it('convierte el "no encontrado" de RENAP (código 04) en un error 400', async () => {
    expect.assertions(3);
    try {
      await new RenapAdapter().validarCUI('9999999999999');
    } catch (error) {
      expect(error).toBeInstanceOf(IdentidadNoValidaError);
      expect(error.status).toBe(400);
      expect(error.motivo).toBe('CIUDADANO NO ENCONTRADO EN EL PADRON');
    }
  });

  it('convierte la caída del servicio externo en un error 503 reintentable', async () => {
    expect.assertions(4);
    const caida = new Error('ETIMEDOUT');
    const cliente = new RenapClienteSimulado({ fallaCon: caida });

    try {
      await new RenapAdapter({ cliente }).validarCUI(CUI_ANA);
    } catch (error) {
      expect(error).toBeInstanceOf(ServicioIdentidadNoDisponibleError);
      expect(error.status).toBe(503);
      expect(error.proveedor).toBe('RENAP');
      expect(error.causa).toBe(caida);
    }
  });

  it('distingue el fallo del proveedor del CUI inexistente', async () => {
    const noExiste = new RenapAdapter().validarCUI('9999999999999');
    const caido = new RenapAdapter({
      cliente: new RenapClienteSimulado({ fallaCon: new Error('503') }),
    }).validarCUI(CUI_ANA);

    await expect(noExiste).rejects.toMatchObject({ status: 400 });
    await expect(caido).rejects.toMatchObject({ status: 503 });
  });

  it('devuelve fechaNacimiento null si el proveedor manda la fecha corrupta', async () => {
    const cliente = {
      consultarCiudadano: async () => ({
        codigoRespuesta: '00',
        mensaje: 'OK',
        datos: { primerNombre: 'ANA', primerApellido: 'LOPEZ', fechaNacimiento: '2001-03-15' },
      }),
    };

    const identidad = await new RenapAdapter({ cliente }).validarCUI(CUI_ANA);

    expect(identidad.fechaNacimiento).toBeNull();
    expect(identidad.nombre).toBe('ANA LOPEZ');
  });

  it('la interfaz obliga a implementar validarCUI', async () => {
    class Incompleto extends IValidacionIdentidad {}

    await expect(new Incompleto().validarCUI(CUI_ANA)).rejects.toThrow(/validarCUI/);
  });
});

describe('Proxy — DocumentoProxy (SCRUM-31)', () => {
  const DUENO = 7;
  const EVALUADOR = 31;
  const fila = {
    id: 500,
    solicitudId: 42,
    estudianteId: DUENO,
    tipo: 'dni',
    nombreArchivo: 'dpi-ana.pdf',
    rutaArchivo: '/expedientes/42/dpi-ana.pdf',
  };

  const proxyPara = (usuario, almacenamiento) =>
    new DocumentoProxy(fila, usuario, {
      evaluadoresAsignados: [EVALUADOR],
      almacenamiento,
    });

  it('comparte la interfaz con el documento real, por eso son intercambiables', () => {
    expect(proxyPara({ id: DUENO, rol: 'estudiante' })).toBeInstanceOf(IDocumento);
    expect(new DocumentoReal(fila)).toBeInstanceOf(IDocumento);
  });

  it.each([
    ['el dueño del expediente', { id: DUENO, rol: 'estudiante' }],
    ['un evaluador asignado a esa solicitud', { id: EVALUADOR, rol: 'evaluador' }],
    ['un administrador', { id: 999, rol: 'administrador' }],
  ])('permite la descarga a %s', async (_caso, usuario) => {
    const almacenamiento = vi.fn().mockResolvedValue('%PDF-1.4 contenido');

    const descargado = await proxyPara(usuario, almacenamiento).descargar();

    expect(descargado).toEqual({
      id: 500,
      tipo: 'dni',
      nombreArchivo: 'dpi-ana.pdf',
      contenido: '%PDF-1.4 contenido',
    });
    expect(almacenamiento).toHaveBeenCalledWith('/expedientes/42/dpi-ana.pdf');
  });

  it.each([
    ['otro estudiante', { id: 8, rol: 'estudiante' }],
    ['un evaluador NO asignado a esa solicitud', { id: 32, rol: 'evaluador' }],
  ])('deniega la descarga a %s', async (_caso, usuario) => {
    expect.assertions(3);
    try {
      await proxyPara(usuario, vi.fn()).descargar();
    } catch (error) {
      expect(error).toBeInstanceOf(AccesoDenegadoError);
      expect(error.status).toBe(403);
      expect(error.documentoId).toBe(500);
    }
  });

  it('NO instancia ni lee el documento real cuando el permiso falla', async () => {
    const almacenamiento = vi.fn();
    const proxy = proxyPara({ id: 8, rol: 'estudiante' }, almacenamiento);

    await expect(proxy.descargar()).rejects.toBeInstanceOf(AccesoDenegadoError);

    expect(proxy.realCargado).toBe(false);
    expect(almacenamiento).not.toHaveBeenCalled();
  });

  it('carga diferida: no toca el almacenamiento hasta que se pide la descarga', async () => {
    const almacenamiento = vi.fn().mockResolvedValue('bytes');
    const proxy = proxyPara({ id: DUENO, rol: 'estudiante' }, almacenamiento);

    expect(proxy.realCargado).toBe(false);
    expect(almacenamiento).not.toHaveBeenCalled();

    await proxy.descargar();

    expect(proxy.realCargado).toBe(true);
    expect(almacenamiento).toHaveBeenCalledTimes(1);
  });

  it('expone los metadatos sin leer el archivo', () => {
    const almacenamiento = vi.fn();
    const proxy = proxyPara({ id: 8, rol: 'estudiante' }, almacenamiento);

    expect(proxy.metadatos).toMatchObject({ id: 500, tipo: 'dni' });
    expect(almacenamiento).not.toHaveBeenCalled();
  });

  it('el mensaje de acceso denegado no revela de quién es el documento', async () => {
    expect.assertions(2);
    try {
      await proxyPara({ id: 8, rol: 'estudiante' }, vi.fn()).descargar();
    } catch (error) {
      expect(error.message).not.toContain(String(DUENO));
      expect(error.message).not.toContain('dpi-ana.pdf');
    }
  });

  it('exige saber quién solicita el documento', () => {
    expect(() => new DocumentoProxy(fila, null)).toThrow(TypeError);
    expect(() => new DocumentoProxy(fila, { rol: 'administrador' })).toThrow(TypeError);
  });

  it('el documento real falla de forma explícita si no se le configura almacenamiento', async () => {
    await expect(new DocumentoReal(fila).descargar()).rejects.toThrow(/almacenamiento/);
  });
});
