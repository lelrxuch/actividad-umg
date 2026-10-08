/**
 * Error de dominio que se lanza cuando se intenta ejecutar una transición que
 * el estado actual de la Solicitud no permite.
 *
 * Se modela como una clase propia (y no como un Error genérico) para que las
 * capas superiores puedan distinguir una regla de negocio violada de un fallo
 * técnico: el middleware de errores puede traducir esto a un HTTP 409 en vez
 * de un 500.
 */
export class TransicionInvalidaError extends Error {
  /**
   * @param {string} accion Nombre de la acción intentada (enviar/evaluar/dictaminar).
   * @param {string} estadoActual Nombre del estado desde el que se intentó.
   * @param {string[]} accionesPermitidas Acciones que sí acepta ese estado.
   */
  constructor(accion, estadoActual, accionesPermitidas = []) {
    const permitidas = accionesPermitidas.length
      ? accionesPermitidas.join(', ')
      : 'ninguna (estado final)';

    super(
      `No se puede "${accion}" una solicitud en estado "${estadoActual}". ` +
        `Acciones permitidas desde "${estadoActual}": ${permitidas}.`
    );

    this.name = 'TransicionInvalidaError';
    this.accion = accion;
    this.estadoActual = estadoActual;
    this.accionesPermitidas = accionesPermitidas;
    this.status = 409;
  }
}
