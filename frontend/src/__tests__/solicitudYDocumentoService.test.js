// Pruebas de solicitudService, documentoService y errores.js.
// Se mockea solo el cliente HTTP (api.js).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import API from '../services/api';
import * as solicitudes from '../services/solicitudService';
import * as documentos from '../services/documentoService';
import { errorDeApi } from '../services/errores';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe('errorDeApi', () => {
  it('conserva el mensaje, el status y los faltantes del backend', () => {
    const e = errorDeApi(
      { response: { status: 400, data: { error: 'Falta: carta.', faltantes: ['carta'] } } },
      'respaldo'
    );
    expect(e.message).toBe('Falta: carta.');
    expect(e.status).toBe(400);
    expect(e.faltantes).toEqual(['carta']);
  });

  it('conserva solicitudExistente', () => {
    const e = errorDeApi({ response: { status: 409, data: { error: 'x', solicitudExistente: 4 } } }, 'r');
    expect(e.solicitudExistente).toBe(4);
  });

  it('sin respuesta del backend usa el respaldo y no inventa campos', () => {
    const e = errorDeApi(new Error('Network Error'), 'No se pudo');
    expect(e.message).toBe('No se pudo');
    expect(e.status).toBeUndefined();
    expect(e.faltantes).toBeUndefined();
  });
});

describe('solicitudService', () => {
  it('crea con tipo y convocatoria', async () => {
    API.post.mockResolvedValue({ data: { id: 5 } });
    await solicitudes.crearSolicitud({ tipo: 'universitaria', convocatoriaId: 1 });
    expect(API.post).toHaveBeenCalledWith('/solicitudes', { tipo: 'universitaria', convocatoriaId: 1 });
  });

  it('una solicitud duplicada llega con el número de la existente', async () => {
    API.post.mockRejectedValue({ response: { status: 409, data: { error: 'Ya tiene la solicitud 4.', solicitudExistente: 4 } } });
    await expect(solicitudes.crearSolicitud({ tipo: 'universitaria', convocatoriaId: 1 }))
      .rejects.toMatchObject({ solicitudExistente: 4, status: 409 });
  });

  it('listar devuelve siempre un arreglo', async () => {
    API.get.mockResolvedValue({ data: { inesperado: true } });
    expect(await solicitudes.listarMisSolicitudes()).toEqual([]);
    API.get.mockResolvedValue({ data: [{ id: 1 }] });
    expect(await solicitudes.listarMisSolicitudes()).toEqual([{ id: 1 }]);
  });

  it('obtiene por id', async () => {
    API.get.mockResolvedValue({ data: { id: 42 } });
    await solicitudes.obtenerSolicitud(42);
    expect(API.get).toHaveBeenCalledWith('/solicitudes/42');
  });

  it('enviar incompleto conserva los faltantes', async () => {
    API.post.mockRejectedValue({ response: { status: 400, data: { error: 'Incompleto', faltantes: ['titulo'] } } });
    await expect(solicitudes.enviarSolicitud(42, '1234567890101')).rejects.toMatchObject({ faltantes: ['titulo'] });
    expect(API.post).toHaveBeenCalledWith('/solicitudes/42/enviar', { cui: '1234567890101' });
  });

  it('enviar con RENAP caído conserva el 503', async () => {
    API.post.mockRejectedValue({ response: { status: 503, data: { error: 'El servicio de RENAP no está disponible' } } });
    await expect(solicitudes.enviarSolicitud(42, '1234567890101')).rejects.toMatchObject({
      status: 503,
      message: 'El servicio de RENAP no está disponible',
    });
  });
});

describe('documentoService', () => {
  it('lista los documentos de una solicitud y devuelve el arreglo', async () => {
    API.get.mockResolvedValue({ data: { solicitudId: 42, documentos: [{ tipo: 'dni' }] } });
    expect(await documentos.listarDocumentos(42)).toEqual([{ tipo: 'dni' }]);
    expect(API.get).toHaveBeenCalledWith('/documentos/solicitud/42');
  });

  it('sube en multipart con los campos que espera multer', async () => {
    API.post.mockResolvedValue({ data: { documento: { id: 9 } } });
    const archivo = new File(['%PDF'], 'dpi.pdf', { type: 'application/pdf' });

    const doc = await documentos.subirDocumento(42, 'dni', archivo);

    const [ruta, cuerpo] = API.post.mock.calls[0];
    expect(ruta).toBe('/documentos');
    expect(cuerpo).toBeInstanceOf(FormData);
    expect(cuerpo.get('solicitudId')).toBe('42');
    expect(cuerpo.get('tipo')).toBe('dni');
    // El campo se llama "archivo": con otro nombre, multer responde 400.
    expect(cuerpo.get('archivo')).toBeInstanceOf(File);
    expect(doc).toEqual({ id: 9 });
  });

  it('el rechazo del backend llega con su mensaje', async () => {
    API.post.mockRejectedValue({ response: { status: 413, data: { error: 'El archivo supera el límite de 5 MB.' } } });
    await expect(documentos.subirDocumento(42, 'dni', new File(['x'], 'a.pdf')))
      .rejects.toThrow('El archivo supera el límite de 5 MB.');
  });

  it('descargarDocumento pide el archivo con responseType blob', async () => {
  API.get.mockResolvedValue({ data: new Blob(['pdf-data']) });

  // Mock global de URL.createObjectURL y revokeObjectURL para jsdom
  window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/123');
  window.URL.revokeObjectURL = vi.fn();

  await documentos.descargarDocumento(15, 'expediente.pdf');

  expect(API.get).toHaveBeenCalledWith('/documentos/15/descargar', {
    responseType: 'blob',
  });
});
});

describe('solicitudService — doble aprobación', () => {
  it('establecerMonto hace PATCH con el monto', async () => {
    API.patch.mockResolvedValue({ data: { id: 42, montoSolicitado: 15000 } });

    const r = await solicitudes.establecerMonto(42, '15000');

    expect(API.patch).toHaveBeenCalledWith('/solicitudes/42/monto', { monto: '15000' });
    expect(r.montoSolicitado).toBe(15000);
  });

  it('establecerMonto propaga el mensaje del backend', async () => {
    API.patch.mockRejectedValue({ response: { status: 409, data: { error: 'Solo en Borrador.' } } });

    await expect(solicitudes.establecerMonto(42, 1)).rejects.toThrow('Solo en Borrador.');
  });

  it('autorizarSolicitud hace POST con el booleano', async () => {
    API.post.mockResolvedValue({ data: { id: 42, estado: 'Aprobada' } });

    const r = await solicitudes.autorizarSolicitud(42, true);

    expect(API.post).toHaveBeenCalledWith('/solicitudes/42/autorizacion', { aprobado: true });
    expect(r.estado).toBe('Aprobada');
  });

  it('autorizarSolicitud propaga el 403 del backend', async () => {
    API.post.mockRejectedValue({ response: { status: 403, data: { error: 'La misma persona no puede dar las dos aprobaciones.' } } });

    await expect(solicitudes.autorizarSolicitud(42, true)).rejects.toMatchObject({
      status: 403,
      message: 'La misma persona no puede dar las dos aprobaciones.',
    });
  });
});
