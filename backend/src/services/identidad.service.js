// Validación de identidad de estudiantes.
//
// Punto de integración del patrón Adapter (backend/src/patterns/structural).
// Este service es el único consumidor de IValidacionIdentidad en el backend:
// recibe un CUI, delega en el adaptador y devuelve una decisión de dominio.
// No conoce RENAP; conoce la interfaz. Cambiar de proveedor es cambiar el
// adaptador que se le inyecta.
import { RenapAdapter } from '../patterns/structural/RenapAdapter.js';
import { IValidacionIdentidad } from '../patterns/structural/IValidacionIdentidad.js';

/** Adaptador por defecto del sistema. */
const validadorPorDefecto = new RenapAdapter();

/**
 * Valida la identidad de un estudiante por su CUI.
 *
 * Los errores del adaptador se propagan tal cual, porque ya vienen traducidos a
 * términos del dominio y con su `status`: 400 si el CUI está mal o no existe,
 * 503 si el registro externo no respondió. El controller solo tiene que
 * reenviarlos.
 *
 * @param {string} cui CUI con o sin separadores.
 * @param {object} [opciones]
 * @param {IValidacionIdentidad} [opciones.validador] Adaptador a usar; se
 *   inyecta en las pruebas y permitiría validar contra otro registro.
 * @returns {Promise<{valido: boolean, cui: string, nombre: string, fechaNacimiento: Date|null}>}
 * @throws {import('../patterns/structural/ErroresIdentidad.js').IdentidadNoValidaError}
 * @throws {import('../patterns/structural/ErroresIdentidad.js').ServicioIdentidadNoDisponibleError}
 */
export async function validarIdentidad(cui, { validador = validadorPorDefecto } = {}) {
  if (!(validador instanceof IValidacionIdentidad)) {
    throw new TypeError('El validador debe implementar IValidacionIdentidad.');
  }

  return validador.validarCUI(cui);
}

/**
 * Comprueba si el nombre declarado por el estudiante coincide con el del
 * registro civil, además de que el CUI exista.
 *
 * La comparación es laxa a propósito —ignora mayúsculas, acentos y espacios
 * repetidos— porque RENAP devuelve los nombres en mayúsculas y sin tildes, y
 * rechazar a alguien por haber escrito "José" en vez de "JOSE" sería un falso
 * negativo que bloquearía un registro legítimo.
 *
 * @param {string} cui
 * @param {string} nombreDeclarado Nombre tal como lo escribió el estudiante.
 * @param {object} [opciones] Ver {@link validarIdentidad}.
 * @returns {Promise<{valido: boolean, cui: string, nombre: string,
 *   fechaNacimiento: Date|null, coincideNombre: boolean}>}
 */
export async function validarIdentidadConNombre(cui, nombreDeclarado, opciones = {}) {
  const identidad = await validarIdentidad(cui, opciones);

  return { ...identidad, coincideNombre: normalizar(identidad.nombre) === normalizar(nombreDeclarado) };
}

/**
 * Deja un nombre comparable: sin acentos, en minúsculas y con un solo espacio.
 * @param {string} texto
 * @returns {string}
 */
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
