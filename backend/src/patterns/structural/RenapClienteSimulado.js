/**
 * Patrón Adapter — Adaptado (Adaptee): el cliente del servicio externo.
 *
 * ESTA CLASE ES A PROPÓSITO INCÓMODA. Imita el contrato real de RENAP, que no
 * se parece a lo que el dominio necesita:
 *
 *   - el método se llama `consultarCiudadano` y recibe `{ numeroDocumento }`,
 *     no un CUI pelado;
 *   - no lanza excepciones por "no encontrado": devuelve un `codigoRespuesta`
 *     numérico en texto ('00' es éxito, el resto son fallos);
 *   - parte el nombre en cuatro campos;
 *   - devuelve la fecha como 'DD/MM/AAAA'.
 *
 * Es justamente esa incomodidad la que justifica el adaptador: traducir todo
 * esto una sola vez, en un solo lugar.
 *
 * NOTA DE IMPLEMENTACIÓN:
 * El consumo real del web service queda para el ticket de integración con
 * RENAP. Este cliente responde desde un padrón en memoria y permite forzar
 * caídas, de modo que el adaptador y sus pruebas se ejerciten completos sin
 * depender de la red.
 */
export class RenapClienteSimulado {
  /**
   * @param {object} [opciones]
   * @param {Record<string, object>} [opciones.padron] CUI → datos del ciudadano.
   * @param {Error|null} [opciones.fallaCon] Si se indica, toda consulta lanza
   *   este error, para simular una caída del servicio.
   */
  constructor({ padron, fallaCon = null } = {}) {
    this.padron = padron ?? RenapClienteSimulado.PADRON_DEMO;
    this.fallaCon = fallaCon;
    /** @type {string[]} CUIs consultados; permite verificar la traducción de entrada. */
    this.consultas = [];
  }

  /** Padrón de demostración para desarrollo local y pruebas. */
  static get PADRON_DEMO() {
    return {
      '1234567890101': {
        primerNombre: 'ANA',
        segundoNombre: 'MARIA',
        primerApellido: 'LOPEZ',
        segundoApellido: 'GARCIA',
        fechaNacimiento: '15/03/2001',
      },
      '2345678901202': {
        primerNombre: 'CARLOS',
        segundoNombre: '',
        primerApellido: 'PEREZ',
        segundoApellido: '',
        fechaNacimiento: '02/11/1998',
      },
    };
  }

  /**
   * Consulta al padrón, con la firma y la forma de respuesta de RENAP.
   *
   * @param {{numeroDocumento: string}} peticion
   * @returns {Promise<{codigoRespuesta: string, mensaje: string, datos?: object}>}
   * @throws {Error} Solo por fallas de transporte del servicio, nunca por "no encontrado".
   */
  async consultarCiudadano({ numeroDocumento }) {
    if (this.fallaCon) throw this.fallaCon;

    this.consultas.push(numeroDocumento);
    const datos = this.padron[numeroDocumento];

    if (!datos) {
      return { codigoRespuesta: '04', mensaje: 'CIUDADANO NO ENCONTRADO EN EL PADRON' };
    }

    return { codigoRespuesta: '00', mensaje: 'CONSULTA EXITOSA', datos };
  }
}
