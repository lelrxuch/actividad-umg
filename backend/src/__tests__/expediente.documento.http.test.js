// Pruebas de la capa HTTP de Expedientes (SCRUM-43) y Documentos (SCRUM-44).
//
// Las reglas de dominio ya están cubiertas en structural.services.test.js y en
// patterns/*. Lo que se prueba aquí es lo único que agrega esta capa y que
// nadie más puede atrapar: que los errores de dominio lleguen con su código
// HTTP y que el identificador del token se traduzca al que entiende el Proxy.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as expedienteController from '../controllers/expediente.controller.js';
import * as documentoController from '../controllers/documento.controller.js';
import * as documentoRepository from '../repositories/documento.repository.js';

vi.mock('../repositories/documento.repository.js', () => ({
  findById: vi.fn(),
  evaluadoresDeSolicitud: vi.fn(),
}));

/** Doble de res que registra lo que el controller respondió. */
function resFalso() {
  const res = {
    statusCode: 200,
    cuerpo: undefined,
    cabeceras: {},
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
    send(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
    setHeader(nombre, valor) {
      this.cabeceras[nombre] = valor;
    },
  };
  return res;
}

const DOCUMENTOS_COMPLETOS = {
  dni: '1234567890101',
  titulo: { nivel: 'diversificado', institucion: 'INEB' },
  carta: { autor: 'Prof. Ramírez', contenido: 'Recomiendo al estudiante.' },
};

describe('expediente.controller — SCRUM-43', () => {
  it('cierra el expediente completo con 201', () => {
    const res = resFalso();
    expedienteController.armarExpediente(
      { body: { tipo: 'nivel-medio', documentos: DOCUMENTOS_COMPLETOS } },
      res
    );

    expect(res.statusCode).toBe(201);
    expect(res.cuerpo.expediente).toBeTruthy();
  });

  it('responde 400 CON la lista de faltantes cuando el expediente está incompleto', () => {
    const res = resFalso();
    expedienteController.armarExpediente({ body: { tipo: 'posgrado', documentos: {} } }, res);

    expect(res.statusCode).toBe(400);
    // Lo que importa no es el 400 sino que el estudiante sepa qué le falta.
    expect(Array.isArray(res.cuerpo.faltantes)).toBe(true);
    expect(res.cuerpo.faltantes.length).toBeGreaterThan(0);
  });

  it('responde 400 cuando la modalidad no existe, no 500', () => {
    const res = resFalso();
    expedienteController.armarExpediente(
      { body: { tipo: 'beca-inventada', documentos: DOCUMENTOS_COMPLETOS } },
      res
    );

    expect(res.statusCode).toBe(400);
  });

  it('la revisión responde 200 aunque falten documentos', () => {
    const res = resFalso();
    expedienteController.revisarExpediente({ body: { tipo: 'posgrado', documentos: {} } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.cuerpo.completo).toBe(false);
    expect(res.cuerpo.faltantes.length).toBeGreaterThan(0);
  });

  it('no revienta si el body viene vacío', () => {
    const res = resFalso();
    expect(() => expedienteController.revisarExpediente({}, res)).not.toThrow();
    expect(res.statusCode).toBe(400);
  });
});

describe('documento.controller — SCRUM-44', () => {
  const FILA = {
    id: 9,
    solicitudId: 3,
    estudianteId: 100,
    tipo: 'dni',
    nombreArchivo: 'dpi.pdf',
    rutaArchivo: 'exp/3/dpi.pdf',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    documentoRepository.findById.mockResolvedValue(FILA);
    documentoRepository.evaluadoresDeSolicitud.mockResolvedValue([200, 201]);
  });

  it('traduce el sub del token al id del dominio: el dueño puede descargar', async () => {
    const res = resFalso();
    // El JWT guarda el identificador en `sub`, no en `id`. Si el controller no
    // lo traduce, el Proxy no reconoce al dueño y esto daría 403.
    await documentoController.descargarDocumento(
      { params: { id: '9' }, usuario: { sub: 100, rol: 'estudiante' } },
      res
    );

    expect(res.statusCode).not.toBe(403);
  });

  it('deniega con 403 a un estudiante ajeno', async () => {
    const res = resFalso();
    await documentoController.descargarDocumento(
      { params: { id: '9' }, usuario: { sub: 999, rol: 'estudiante' } },
      res
    );

    expect(res.statusCode).toBe(403);
    expect(res.cuerpo.error).toBeTruthy();
  });

  it('deniega con 403 a un evaluador que no está asignado a esa solicitud', async () => {
    const res = resFalso();
    await documentoController.descargarDocumento(
      { params: { id: '9' }, usuario: { sub: 777, rol: 'evaluador' } },
      res
    );

    expect(res.statusCode).toBe(403);
  });

  it('un evaluador asignado no recibe 403', async () => {
    const res = resFalso();
    await documentoController.descargarDocumento(
      { params: { id: '9' }, usuario: { sub: 200, rol: 'evaluador' } },
      res
    );

    expect(res.statusCode).not.toBe(403);
  });

  it('responde 404 si el documento no existe', async () => {
    documentoRepository.findById.mockResolvedValueOnce(null);
    const res = resFalso();
    await documentoController.descargarDocumento(
      { params: { id: '404' }, usuario: { sub: 100, rol: 'estudiante' } },
      res
    );

    expect(res.statusCode).toBe(404);
  });

  it('el mensaje del 403 no revela de quién es el documento', async () => {
    const res = resFalso();
    await documentoController.descargarDocumento(
      { params: { id: '9' }, usuario: { sub: 999, rol: 'estudiante' } },
      res
    );

    const mensaje = JSON.stringify(res.cuerpo);
    expect(mensaje).not.toContain('dpi.pdf');
    expect(mensaje).not.toContain('exp/3');
    expect(mensaje).not.toContain('100');
  });

  it('consultarPermiso informa sin leer el archivo ni fallar', async () => {
    const res = resFalso();
    await documentoController.consultarPermiso(
      { params: { id: '9' }, usuario: { sub: 999, rol: 'estudiante' } },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.cuerpo.puedeDescargar).toBe(false);
  });

  it('un administrador puede descargar cualquier documento', async () => {
    const res = resFalso();
    await documentoController.consultarPermiso(
      { params: { id: '9' }, usuario: { sub: 1, rol: 'administrador' } },
      res
    );

    expect(res.cuerpo.puedeDescargar).toBe(true);
  });
});

describe('almacenamiento — guarda de ruta', () => {
  it('rechaza con 403 una ruta que se sale del directorio de subidas', async () => {
    const { leerArchivo } = await import('../config/almacenamiento.js');

    await expect(leerArchivo('../../../etc/passwd')).rejects.toMatchObject({ status: 403 });
  });

  it('un archivo inexistente dentro del directorio da 404, no 403', async () => {
    const { leerArchivo } = await import('../config/almacenamiento.js');

    await expect(leerArchivo('no-existe/archivo.pdf')).rejects.toMatchObject({ status: 404 });
  });
});
