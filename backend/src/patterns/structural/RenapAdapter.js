import { IValidacionIdentidad } from './IValidacionIdentidad.js';
import { RenapClienteSimulado } from './RenapClienteSimulado.js';
import { IdentidadNoValidaError, ServicioIdentidadNoDisponibleError } from './ErroresIdentidad.js';

/** Longitud del Código Único de Identificación guatemalteco. */
const LARGO_CUI = 13;

/** Código con el que RENAP indica que la consulta fue exitosa. */
const CODIGO_EXITO = '00';

/**
 * Patrón Adapter — Adaptador concreto para RENAP.
 *
 * PROBLEMA QUE RESUELVE:
 * Es la única clase del sistema que entiende el dialecto de RENAP. Traduce en
 * las tres direcciones donde las dos interfaces no coinciden:
 *
 *   1. ENTRADA: el dominio maneja un CUI que el usuario escribe con espacios o
 *      guiones; RENAP espera `{ numeroDocumento }` con 13 dígitos limpios.
 *   2. RESPUESTA: RENAP contesta con `codigoRespuesta` en texto y el nombre
 *      partido en cuatro campos; el dominio quiere un booleano, un nombre
 *      completo y una fecha real.
 *   3. ERRORES: RENAP señala "no encontrado" con un código dentro de una
 *      respuesta exitosa, y las caídas de red como excepciones crudas. El
 *      adaptador convierte lo primero en IdentidadNoValidaError (400, no
 *      reintentable) y lo segundo en ServicioIdentidadNoDisponibleError (503,
 *      reintentable), que es la distinción que el resto del sistema necesita.
 *
 * Cambiar de proveedor —o que RENAP cambie su contrato— se resuelve dentro de
 * esta clase: ningún service se enterará.
 */
export class RenapAdapter extends IValidacionIdentidad {
  /**
   * @param {object} [opciones]
   * @param {{consultarCiudadano: (p: {numeroDocumento: string}) => Promise<object>}} [opciones.cliente]
   *   Cliente del servicio externo. Por defecto el simulado; inyectarlo permite
   *   enchufar el web service real sin tocar esta clase, y probar las caídas.
   */
  constructor({ cliente } = {}) {
    super();
    this.cliente = cliente ?? new RenapClienteSimulado();
  }

  /**
   * Normaliza el CUI tal como lo escribe el usuario a lo que exige RENAP.
   * @param {string} cui
   * @returns {string} Solo dígitos.
   */
  static normalizarCUI(cui) {
    return String(cui ?? '').replace(/[\s-]/g, '');
  }

  /**
   * Convierte la fecha 'DD/MM/AAAA' de RENAP en un Date.
   * @param {string} fecha
   * @returns {Date|null} `null` si el proveedor no la envió o viene corrupta.
   */
  static traducirFecha(fecha) {
    const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha ?? '');
    if (!partes) return null;

    const [, dia, mes, anio] = partes;
    return new Date(Number(anio), Number(mes) - 1, Number(dia));
  }

  /**
   * Une los cuatro campos de nombre de RENAP en uno, descartando los vacíos.
   * @param {{primerNombre?: string, segundoNombre?: string, primerApellido?: string, segundoApellido?: string}} datos
   * @returns {string}
   */
  static traducirNombre({ primerNombre, segundoNombre, primerApellido, segundoApellido } = {}) {
    return [primerNombre, segundoNombre, primerApellido, segundoApellido]
      .filter((parte) => parte && parte.trim())
      .join(' ')
      .trim();
  }

  /**
   * Valida un CUI contra RENAP, devolviendo el resultado en forma de dominio.
   *
   * @param {string} cui CUI con o sin separadores.
   * @returns {Promise<{valido: boolean, cui: string, nombre: string, fechaNacimiento: Date|null}>}
   * @throws {IdentidadNoValidaError} Formato incorrecto o CUI inexistente (400).
   * @throws {ServicioIdentidadNoDisponibleError} El servicio externo falló (503).
   */
  async validarCUI(cui) {
    // 1. Traducción de entrada. Se valida el formato antes de salir a la red:
    // un CUI mal escrito no amerita una llamada al servicio externo.
    const numeroDocumento = RenapAdapter.normalizarCUI(cui);

    if (!new RegExp(`^\\d{${LARGO_CUI}}$`).test(numeroDocumento)) {
      throw new IdentidadNoValidaError(
        numeroDocumento || String(cui ?? ''),
        `el CUI debe tener exactamente ${LARGO_CUI} dígitos`
      );
    }

    // 2. Llamada al adaptado, envuelta para traducir sus fallas de transporte.
    let respuesta;
    try {
      respuesta = await this.cliente.consultarCiudadano({ numeroDocumento });
    } catch (causa) {
      throw new ServicioIdentidadNoDisponibleError('RENAP', causa);
    }

    // 3. Traducción de la respuesta: el "no encontrado" viene como código, no
    // como excepción, así que aquí se convierte en el error del dominio.
    if (respuesta?.codigoRespuesta !== CODIGO_EXITO) {
      throw new IdentidadNoValidaError(
        numeroDocumento,
        respuesta?.mensaje ?? 'el registro no reconoce el CUI'
      );
    }

    return {
      valido: true,
      cui: numeroDocumento,
      nombre: RenapAdapter.traducirNombre(respuesta.datos),
      fechaNacimiento: RenapAdapter.traducirFecha(respuesta.datos?.fechaNacimiento),
    };
  }
}
