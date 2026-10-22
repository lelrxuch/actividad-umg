// Lector de archivos del expediente.
//
// Implementa el contrato `(ruta) => Promise<Buffer>` que esperan DocumentoReal
// y DocumentoProxy, de modo que cambiar disco local por S3 más adelante sea
// reemplazar este módulo y nada más.
//
// POR QUÉ LA COMPROBACIÓN DE RUTA:
// `ruta_archivo` sale de la base de datos, pero el valor lo escribió la subida
// de documentos (SCRUM-42). Si esa validación falla alguna vez, una ruta como
// "../../../etc/passwd" convertiría el endpoint de descarga en una lectura
// arbitraria de disco. Verificar aquí que la ruta resuelta cae dentro del
// directorio de subidas cuesta tres líneas y no depende de que otra capa haga
// bien su trabajo.
import fs from 'node:fs/promises';
import path from 'node:path';

/** Directorio raíz de los archivos subidos. */
export const DIRECTORIO_SUBIDAS = path.resolve(
  process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
);

/**
 * Lee un archivo del expediente.
 *
 * @param {string} ruta Ruta relativa al directorio de subidas, tal como quedó
 *   guardada en documentos.ruta_archivo.
 * @returns {Promise<Buffer>}
 * @throws {Error & { status: number }} 404 si no existe, 403 si la ruta se
 *   sale del directorio de subidas.
 */
export async function leerArchivo(ruta) {
  const completa = path.resolve(DIRECTORIO_SUBIDAS, ruta || '');
  const raiz = DIRECTORIO_SUBIDAS + path.sep;

  if (completa !== DIRECTORIO_SUBIDAS && !completa.startsWith(raiz)) {
    const error = new Error('La ruta del archivo está fuera del directorio de subidas.');
    error.status = 403;
    throw error;
  }

  try {
    return await fs.readFile(completa);
  } catch (causa) {
    if (causa.code === 'ENOENT' || causa.code === 'EISDIR') {
      const error = new Error('El archivo del documento no está disponible.');
      error.status = 404;
      throw error;
    }
    throw causa;
  }
}

/**
 * Extensiones admitidas para un documento del expediente.
 *
 * Lista blanca y no lista negra: lo que no está aquí se guarda sin extensión,
 * de modo que un nombre como "dpi.pdf.sh" no deja un ejecutable en disco.
 */
const EXTENSIONES_ADMITIDAS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

/**
 * Extensión segura derivada del nombre que mandó el navegador.
 * @param {string} nombreOriginal
 * @returns {string} La extensión en minúsculas si está admitida, o ''.
 */
function extensionSegura(nombreOriginal) {
  const ext = path.extname(String(nombreOriginal || '')).toLowerCase();
  return EXTENSIONES_ADMITIDAS.has(ext) ? ext : '';
}

/**
 * Guarda un archivo del expediente y devuelve su ruta relativa.
 *
 * POR QUÉ NO SE USA EL NOMBRE DEL NAVEGADOR COMO RUTA:
 * `originalname` lo controla quien sube el archivo. Un valor como
 * "../../index.js" sobrescribiría código del servidor, y "dpi.pdf.sh" dejaría
 * un ejecutable en disco. El nombre en disco se genera acá —tipo, momento y un
 * sufijo aleatorio— y del nombre original solo se conserva la extensión, si
 * está en la lista blanca. El nombre que el usuario ve se guarda aparte, en
 * `documentos.nombre_archivo`, donde no puede tocar el sistema de archivos.
 *
 * @param {object} datos
 * @param {number} datos.solicitudId Carpeta destino dentro de las subidas.
 * @param {string} datos.tipo Tipo de documento; prefija el nombre en disco.
 * @param {string} datos.nombreOriginal Nombre que mandó el navegador.
 * @param {Buffer} datos.contenido
 * @returns {Promise<string>} Ruta relativa a DIRECTORIO_SUBIDAS, la que se
 *   guarda en `documentos.ruta_archivo` y la que luego lee {@link leerArchivo}.
 */
export async function guardarArchivo({ solicitudId, tipo, nombreOriginal, contenido }) {
  // path.posix y no path.join: esta ruta se GUARDA en documentos.ruta_archivo.
  // path.join usa el separador del sistema, así que en Windows quedaría
  // "exp\7\dni-...", y esa fila no resolvería en Linux, donde la barra
  // invertida es un carácter de nombre válido y no un separador. La ruta
  // almacenada es siempre POSIX; path.resolve acepta barras normales también
  // en Windows, así que la lectura funciona en los dos.
  const carpeta = path.posix.join('exp', String(Number(solicitudId)));
  const sufijo = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const nombreEnDisco = `${String(tipo).replace(/[^a-z0-9-]/gi, '')}-${sufijo}${extensionSegura(nombreOriginal)}`;
  const relativa = path.posix.join(carpeta, nombreEnDisco);

  // La ruta se construyó acá, pero se verifica igual: si algún día este cálculo
  // cambia, la comprobación es lo que evita escribir fuera del directorio.
  const completa = path.resolve(DIRECTORIO_SUBIDAS, relativa);
  if (!completa.startsWith(DIRECTORIO_SUBIDAS + path.sep)) {
    const error = new Error('La ruta de destino está fuera del directorio de subidas.');
    error.status = 500;
    throw error;
  }

  await fs.mkdir(path.dirname(completa), { recursive: true });
  await fs.writeFile(completa, contenido);

  return relativa;
}
