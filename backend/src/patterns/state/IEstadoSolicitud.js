import { TransicionInvalidaError } from './TransicionInvalidaError.js';

/**
 * Patrón State — Interfaz (clase base abstracta) de los estados de una Solicitud.
 *
 * PROBLEMA QUE RESUELVE:
 * El ciclo de vida de una solicitud de beca (Borrador → Enviada → En Evaluación →
 * Aprobada/Rechazada) tiende a implementarse con un `switch (solicitud.estado)`
 * repetido en cada operación del service. Ese enfoque tiene dos costos: la regla
 * de "qué transición es válida desde dónde" queda dispersa por todo el código, y
 * agregar un estado nuevo obliga a tocar todos los switch existentes.
 *
 * El patrón State encapsula cada estado en su propia clase. El objeto Solicitud
 * (el "contexto") delega el comportamiento en el estado actual, y cada estado
 * decide qué transiciones acepta. Agregar un estado nuevo es agregar una clase,
 * sin modificar las existentes (principio abierto/cerrado).
 *
 * DISEÑO:
 * Esta clase base implementa las tres acciones lanzando TransicionInvalidaError.
 * Cada estado concreto sobrescribe únicamente las acciones que sí permite, de
 * modo que toda transición no declarada explícitamente queda prohibida por
 * omisión. Así es imposible olvidar bloquear un caso inválido.
 *
 * @abstract
 */
export class IEstadoSolicitud {
  /**
   * Nombre legible del estado, usado en mensajes de error, persistencia y notificaciones.
   * @returns {string}
   * @abstract
   */
  get nombre() {
    throw new Error(`${this.constructor.name} debe implementar el getter "nombre".`);
  }

  /**
   * Acciones que este estado acepta. Sirve para construir mensajes de error útiles
   * y para que la API pueda exponer qué puede hacer el usuario a continuación.
   * @returns {string[]}
   */
  get accionesPermitidas() {
    return [];
  }

  /**
   * Envía la solicitud a revisión.
   * @param {import('./Solicitud.js').Solicitud} solicitud
   * @throws {TransicionInvalidaError} Si el estado actual no permite enviar.
   */
  enviar(solicitud) {
    throw new TransicionInvalidaError('enviar', this.nombre, this.accionesPermitidas);
  }

  /**
   * Pasa la solicitud a evaluación por parte de un analista.
   * @param {import('./Solicitud.js').Solicitud} solicitud
   * @throws {TransicionInvalidaError} Si el estado actual no permite evaluar.
   */
  evaluar(solicitud) {
    throw new TransicionInvalidaError('evaluar', this.nombre, this.accionesPermitidas);
  }

  /**
   * Emite el dictamen final sobre la solicitud.
   * @param {import('./Solicitud.js').Solicitud} solicitud
   * @param {boolean} aprobado
   * @throws {TransicionInvalidaError} Si el estado actual no permite dictaminar.
   */
  dictaminar(solicitud, aprobado) {
    throw new TransicionInvalidaError('dictaminar', this.nombre, this.accionesPermitidas);
  }
}
