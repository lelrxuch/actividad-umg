// Pruebas de la subida de documentos (SCRUM-42).
//
// Se prueban las reglas del service y la guarda de nombre de archivo del
// almacenamiento, que son lo único que esta historia agrega y lo único que
// nadie más puede atrapar. El control de acceso a la LECTURA ya está cubierto
// en structural.services.test.js: el Proxy no participa en la subida.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as documentoService from '../services/documento.service.js';
import * as documentoRepository from '../repositories/documento.repository.js';
import * as solicitudRepository from '../repositories/solicitud.repository.js';

vi.mock('../repositories/documento.repository.js', () => ({
  crear: vi.fn(),
  listarDeSolicitud: vi.fn(),
  findById: vi.fn(),
  evaluadoresDeSolicitud: vi.fn(),
}));

vi.mock('../repositories/solicitud.repository.js', () => ({
  findById: vi.fn(),
}));

/** Solicitud en Borrador, de la estudiante 10, sin modalidad registrada. */
const BORRADOR = { id: 3, estudiante_id: 10, estado: 'Borrador', tipo: null };

const DUENO = { id: 10, rol: 'estudiante' };

const ARCHIVO = { nombreOriginal: 'dpi.pdf', contenido: Buffer.from('contenido') };

/** Almacenamiento falso: registra lo que le pidieron guardar, sin tocar disco. */
function almacenamientoFalso() {
  const escrituras = [];
  const fn = async (datos) => {
    escrituras.push(datos);
    return `exp/${datos.solicitudId}/generado.pdf`;
  };
  fn.escrituras = escrituras;
  return fn;
}

/**
 * Almacenamiento inyectado en TODAS las pruebas del service.
 *
 * Si alguna no lo inyectara, usaría el escritor real y dejaría archivos en el
 * directorio de subidas del repositorio. Pasó mientras se escribía esta
 * historia: un mutante que saltaba la validación hizo que una prueba de
 * rechazo escribiera en disco de verdad.
 */
let almacenamiento;

beforeEach(() => {
  vi.clearAllMocks();
  almacenamiento = almacenamientoFalso();
  solicitudRepository.findById.mockResolvedValue(BORRADOR);
  documentoRepository.listarDeSolicitud.mockResolvedValue([]);
  documentoRepository.crear.mockImplementation(async (fila) => ({ id: 99, ...fila }));
});

/** Llama al service inyectando siempre el almacenamiento falso. */
function subir(datos) {
  return documentoService.subirDocumento(datos, { almacenamiento });
}

describe('subirDocumento — camino feliz', () => {
  it('guarda el archivo y crea la fila con el estudiante de la solicitud', async () => {
    const creado = await documentoService.subirDocumento(
      { solicitudId: 3, tipo: 'dni', archivo: ARCHIVO, usuario: DUENO },
      { almacenamiento }
    );

    expect(creado.id).toBe(99);
    // estudianteId sale de la solicitud, no del token: si viniera del token,
    // un administrador subiendo por otro dejaría la fila a su propio nombre y
    // el Proxy no reconocería al dueño después.
    expect(creado.estudianteId).toBe(10);
    expect(almacenamiento.escrituras).toHaveLength(1);
  });

  it('guarda el nombre original como nombre visible, no como ruta', async () => {
    const creado = await documentoService.subirDocumento(
      { solicitudId: 3, tipo: 'dni', archivo: ARCHIVO, usuario: DUENO },
      { almacenamiento }
    );

    expect(creado.nombreArchivo).toBe('dpi.pdf');
    // La ruta la decide el almacenamiento, nunca el navegador.
    expect(creado.rutaArchivo).not.toContain('dpi.pdf');
  });

  it('un administrador puede subir a una solicitud ajena', async () => {
    const creado = await documentoService.subirDocumento(
      { solicitudId: 3, tipo: 'dni', archivo: ARCHIVO, usuario: { id: 1, rol: 'administrador' } },
      { almacenamiento }
    );

    expect(creado.estudianteId).toBe(10);
  });
});

describe('subirDocumento — rechazos', () => {
  it('400 si no viene archivo', async () => {
    await expect(
      subir({ solicitudId: 3, tipo: 'dni', archivo: null, usuario: DUENO })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('400 si el archivo viene vacío', async () => {
    await expect(
      subir({
        solicitudId: 3,
        tipo: 'dni',
        archivo: { nombreOriginal: 'vacio.pdf', contenido: Buffer.alloc(0) },
        usuario: DUENO,
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('400 si falta el tipo', async () => {
    await expect(
      subir({ solicitudId: 3, archivo: ARCHIVO, usuario: DUENO })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('404 si la solicitud no existe', async () => {
    solicitudRepository.findById.mockResolvedValueOnce(null);

    await expect(
      subir({
        solicitudId: 404,
        tipo: 'dni',
        archivo: ARCHIVO,
        usuario: DUENO,
      })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('403 si la solicitud es de otro estudiante', async () => {
    await expect(
      subir({
        solicitudId: 3,
        tipo: 'dni',
        archivo: ARCHIVO,
        usuario: { id: 999, rol: 'estudiante' },
      })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('403 a un evaluador: puede leer el expediente, no escribirlo', async () => {
    await expect(
      subir({
        solicitudId: 3,
        tipo: 'dni',
        archivo: ARCHIVO,
        usuario: { id: 20, rol: 'evaluador' },
      })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('409 si la solicitud ya se envió: el expediente se congela', async () => {
    solicitudRepository.findById.mockResolvedValue({ ...BORRADOR, estado: 'Enviada' });

    await expect(
      subir({
        solicitudId: 3,
        tipo: 'dni',
        archivo: ARCHIVO,
        usuario: DUENO,
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('409 en cada estado posterior a Borrador', async () => {
    for (const estado of ['Enviada', 'En Evaluación', 'Aprobada', 'Rechazada']) {
      solicitudRepository.findById.mockResolvedValue({ ...BORRADOR, estado });

      await expect(
        subir({
          solicitudId: 3,
          tipo: 'dni',
          archivo: ARCHIVO,
          usuario: DUENO,
        })
      ).rejects.toMatchObject({ status: 409 });
    }
  });

  it('409 si ya hay un documento de ese tipo', async () => {
    documentoRepository.listarDeSolicitud.mockResolvedValue([
      { id: 1, tipo: 'dni', nombreArchivo: 'anterior.pdf' },
    ]);

    await expect(
      subir({
        solicitudId: 3,
        tipo: 'dni',
        archivo: ARCHIVO,
        usuario: DUENO,
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('no escribe el archivo cuando rechaza', async () => {
    solicitudRepository.findById.mockResolvedValue({ ...BORRADOR, estado: 'Aprobada' });

    await expect(
      documentoService.subirDocumento(
        { solicitudId: 3, tipo: 'dni', archivo: ARCHIVO, usuario: DUENO },
        { almacenamiento }
      )
    ).rejects.toMatchObject({ status: 409 });

    // Lo que importa: un rechazo no deja basura en el directorio de subidas.
    expect(almacenamiento.escrituras).toHaveLength(0);
    expect(documentoRepository.crear).not.toHaveBeenCalled();
  });
});

describe('subirDocumento — el tipo lo decide el Factory', () => {
  it('rechaza un tipo que ninguna modalidad pide', async () => {
    await expect(
      subir({
        solicitudId: 3,
        tipo: 'constancia-inventada',
        archivo: ARCHIVO,
        usuario: DUENO,
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('sin modalidad registrada admite cualquier tipo que alguna beca pida', async () => {
    for (const tipo of ['dni', 'titulo', 'carta']) {
      documentoRepository.listarDeSolicitud.mockResolvedValue([]);

      const creado = await documentoService.subirDocumento(
        { solicitudId: 3, tipo, archivo: ARCHIVO, usuario: DUENO },
        { almacenamiento }
      );

      expect(creado.tipo).toBe(tipo);
    }
  });

  it('con modalidad nivel-medio rechaza el título, que esa beca no pide', async () => {
    solicitudRepository.findById.mockResolvedValue({ ...BORRADOR, tipo: 'nivel-medio' });

    // Es la regla que distingue la modalidad, y sale del Factory, no de un
    // literal en el service.
    await expect(
      subir({
        solicitudId: 3,
        tipo: 'titulo',
        archivo: ARCHIVO,
        usuario: DUENO,
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('con modalidad universitaria sí acepta el título', async () => {
    solicitudRepository.findById.mockResolvedValue({ ...BORRADOR, tipo: 'universitaria' });

    const creado = await documentoService.subirDocumento(
      { solicitudId: 3, tipo: 'titulo', archivo: ARCHIVO, usuario: DUENO },
      { almacenamiento }
    );

    expect(creado.tipo).toBe('titulo');
  });

  it('el mensaje del 400 dice qué documentos sí admite', async () => {
    solicitudRepository.findById.mockResolvedValue({ ...BORRADOR, tipo: 'nivel-medio' });

    await expect(
      subir({
        solicitudId: 3,
        tipo: 'titulo',
        archivo: ARCHIVO,
        usuario: DUENO,
      })
    ).rejects.toThrow(/dni/);
  });
});

describe('listarDocumentos', () => {
  beforeEach(() => {
    documentoRepository.evaluadoresDeSolicitud.mockResolvedValue([20]);
    documentoRepository.listarDeSolicitud.mockResolvedValue([
      { id: 1, tipo: 'dni', nombreArchivo: 'dpi.pdf' },
    ]);
  });

  it('el dueño ve su expediente', async () => {
    const resultado = await documentoService.listarDocumentos(3, DUENO);

    expect(resultado.documentos).toHaveLength(1);
  });

  it('un evaluador asignado también', async () => {
    const resultado = await documentoService.listarDocumentos(3, { id: 20, rol: 'evaluador' });

    expect(resultado.documentos).toHaveLength(1);
  });

  it('403 a un evaluador que no está asignado', async () => {
    await expect(
      documentoService.listarDocumentos(3, { id: 777, rol: 'evaluador' })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('403 a un estudiante ajeno', async () => {
    await expect(
      documentoService.listarDocumentos(3, { id: 999, rol: 'estudiante' })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('no expone la ruta del archivo en disco', async () => {
    const resultado = await documentoService.listarDocumentos(3, DUENO);

    expect(JSON.stringify(resultado)).not.toContain('rutaArchivo');
  });
});

describe('almacenamiento — el nombre en disco no lo decide el navegador', () => {
  it('ignora una ruta con ../ en el nombre original', async () => {
    const { guardarArchivo, DIRECTORIO_SUBIDAS } = await import('../config/almacenamiento.js');
    const path = await import('node:path');
    const fs = await import('node:fs/promises');

    const relativa = await guardarArchivo({
      solicitudId: 7,
      tipo: 'dni',
      nombreOriginal: '../../../etc/passwd',
      contenido: Buffer.from('x'),
    });

    expect(relativa).not.toContain('..');
    expect(relativa.startsWith('exp/7/')).toBe(true);
    // La ruta se guarda en documentos.ruta_archivo, así que tiene que ser la
    // misma en toda máquina: una fila escrita en Windows con "exp\7\..." no
    // resolvería en Linux. Esta aserción es la que atrapa el path.join nativo.
    expect(relativa).not.toContain('\\');

    const completa = path.resolve(DIRECTORIO_SUBIDAS, relativa);
    expect(completa.startsWith(DIRECTORIO_SUBIDAS)).toBe(true);
    await fs.rm(path.join(DIRECTORIO_SUBIDAS, 'exp', '7'), { recursive: true, force: true });
  });

  it('solo conserva extensiones de la lista blanca', async () => {
    const { guardarArchivo, DIRECTORIO_SUBIDAS } = await import('../config/almacenamiento.js');
    const path = await import('node:path');
    const fs = await import('node:fs/promises');

    const peligroso = await guardarArchivo({
      solicitudId: 8,
      tipo: 'dni',
      nombreOriginal: 'dpi.pdf.sh',
      contenido: Buffer.from('x'),
    });
    const permitido = await guardarArchivo({
      solicitudId: 8,
      tipo: 'carta',
      nombreOriginal: 'carta.PDF',
      contenido: Buffer.from('x'),
    });

    expect(peligroso.endsWith('.sh')).toBe(false);
    expect(permitido.endsWith('.pdf')).toBe(true);
    await fs.rm(path.join(DIRECTORIO_SUBIDAS, 'exp', '8'), { recursive: true, force: true });
  });

  it('el archivo se puede volver a leer con leerArchivo', async () => {
    const { guardarArchivo, leerArchivo, DIRECTORIO_SUBIDAS } = await import(
      '../config/almacenamiento.js'
    );
    const path = await import('node:path');
    const fs = await import('node:fs/promises');

    const relativa = await guardarArchivo({
      solicitudId: 9,
      tipo: 'dni',
      nombreOriginal: 'dpi.pdf',
      contenido: Buffer.from('contenido real'),
    });

    // Guardar y leer son las dos mitades del mismo contrato: si una cambia de
    // convención de ruta sin la otra, la descarga da 404 y nadie se entera
    // hasta producción.
    expect((await leerArchivo(relativa)).toString()).toBe('contenido real');
    await fs.rm(path.join(DIRECTORIO_SUBIDAS, 'exp', '9'), { recursive: true, force: true });
  });
});

describe('contrato con el repositorio', () => {
  // POR QUÉ ESTA PRUEBA LEE CÓDIGO FUENTE:
  // Las pruebas de arriba mockean solicitudRepository.findById y le hacen
  // devolver `tipo`. Mientras se escribía SCRUM-42, el SELECT real no traía esa
  // columna: las pruebas daban verde y el endpoint aceptaba un título en una
  // beca de nivel medio. Un mock no puede detectar una columna que falta en la
  // consulta, y una prueba de integración necesitaría PostgreSQL, que esta
  // suite no levanta. Leer la consulta es lo único que cierra el hueco acá.
  it('findById selecciona tipo, que es de donde sale la modalidad', async () => {
    const fs = await import('node:fs/promises');
    const url = await import('node:url');

    const ruta = url.fileURLToPath(
      new URL('../repositories/solicitud.repository.js', import.meta.url)
    );
    const fuente = await fs.readFile(ruta, 'utf8');
    const select = fuente.slice(fuente.indexOf('SELECT'), fuente.indexOf('WHERE id = $1'));

    expect(select).toMatch(/\btipo\b/);
    expect(select).toMatch(/\bestado\b/);
    expect(select).toMatch(/\bestudiante_id\b/);
  });
});
