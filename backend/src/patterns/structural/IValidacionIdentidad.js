/**
 * Patrón Adapter — Interfaz objetivo (Target).
 *
 * PROBLEMA QUE RESUELVE:
 * Validar la identidad de un estudiante es una necesidad del dominio; RENAP es
 * solo el proveedor que hoy la satisface. Si los services llamaran a RENAP
 * directamente, su jerga (códigos de respuesta numéricos, nombres partidos en
 * cuatro campos, fechas en formato local) se filtraría a toda la aplicación, y
 * el día que RENAP cambie su contrato —o que haya que validar contra otro
 * registro— habría que tocar cada llamador.
 *
 * Esta es la interfaz que el dominio *quiere* usar. El adaptador concreto se
 * encarga de que el proveedor externo quepa en ella.
 *
 * @abstract
 */
export class IValidacionIdentidad {
  /**
   * Valida un CUI contra el registro de identidad.
   *
   * @param {string} cui Código Único de Identificación (13 dígitos).
   * @returns {Promise<{valido: boolean, cui: string, nombre: string, fechaNacimiento: Date|null}>}
   *   Resultado en términos del dominio, sin rastro del formato del proveedor.
   * @throws {import('./ErroresIdentidad.js').IdentidadNoValidaError} Si el CUI no existe o es inválido.
   * @throws {import('./ErroresIdentidad.js').ServicioIdentidadNoDisponibleError} Si el proveedor falla.
   * @abstract
   */
  async validarCUI(cui) {
    throw new Error(`${this.constructor.name} debe implementar el método "validarCUI(cui)".`);
  }
}
