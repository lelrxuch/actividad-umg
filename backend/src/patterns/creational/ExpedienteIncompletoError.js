/**
 * Error de dominio que lanza {@link ExpedienteBuilder#build} cuando el
 * expediente no reúne los documentos mínimos de la modalidad.
 *
 * Se modela como clase propia, igual que TransicionInvalidaError del patrón
 * State, para que el controller pueda responder 400 con la lista exacta de lo
 * que falta en vez de un 500 genérico: el estudiante necesita saber qué papel
 * le falta subir, no que "hubo un error".
 */
export class ExpedienteIncompletoError extends Error {
  /**
   * @param {string} tipoBeca Modalidad contra la que se validó.
   * @param {string[]} faltantes Claves de documento ausentes o inválidas.
   */
  constructor(tipoBeca, faltantes) {
    super(
      `El expediente para la beca "${tipoBeca}" está incompleto. ` +
        `Falta: ${faltantes.join(', ')}.`
    );

    this.name = 'ExpedienteIncompletoError';
    this.tipoBeca = tipoBeca;
    this.faltantes = faltantes;
    this.status = 400;
  }
}
