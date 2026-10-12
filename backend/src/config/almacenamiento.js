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
