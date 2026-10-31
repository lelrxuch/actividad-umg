import { IEstadoSolicitud } from './IEstadoSolicitud.js';
import { EstadoBorrador } from './EstadoBorrador.js';
import { INotificacionObserver } from '../observer/INotificacionObserver.js';

/**
 * Solicitud de beca. Cumple dos papeles dentro de los patrones implementados:
 *
 * 1. CONTEXTO del patrón State: no contiene ningún `if` ni `switch` sobre el
 *    estado. Las acciones del negocio (`enviar`, `evaluar`, `dictaminar`) se
 *    delegan al objeto estado actual, que es quien decide si la transición es
 *    válida y a qué estado se pasa.
 *
 * 2. SUJETO del patrón Observer: mantiene la lista de suscriptores y les avisa
 *    cada vez que el estado cambia, sin saber qué hace cada uno con el aviso.
 *
 * Que ambos patrones se crucen aquí es justamente lo que se quiere demostrar:
 * el State decide *cuándo* cambia el estado y el Observer decide *quién se
 * entera*, y ninguno de los dos conoce los detalles del otro.
 */
export class Solicitud {
  /** @type {IEstadoSolicitud} */
  #estado;

  /** @type {INotificacionObserver[]} */
  #observers = [];

  /** @type {Array<{de: string, a: string, fecha: Date}>} */
  #historial = [];

  /** @type {boolean} Si los avisos esperan a {@link publicarNotificaciones}. */
  #notificacionDiferida;

  /** @type {Array<{mensaje: string, contexto: object}>} Avisos aún no publicados. */
  #pendientes = [];

  /**
   * @param {object} datos
   * @param {number|string} [datos.id] Identificador de la solicitud.
   * @param {string} [datos.estudiante] Nombre o correo del solicitante.
   * @param {IEstadoSolicitud} [datos.estado] Estado inicial; por defecto Borrador.
   * @param {boolean} [datos.notificacionDiferida] Si es `true`, un cambio de
   *   estado no avisa en el momento: guarda el aviso hasta que se llame a
   *   {@link publicarNotificaciones}. Es lo que usa el service, para avisar
   *   solo DESPUÉS de haber guardado el estado nuevo en la base de datos.
   */
  constructor({
    id = null,
    estudiante = null,
    estado = new EstadoBorrador(),
    notificacionDiferida = false,
  } = {}) {
    if (!(estado instanceof IEstadoSolicitud)) {
      throw new TypeError('El estado inicial debe ser una instancia de IEstadoSolicitud.');
    }

    this.id = id;
    this.estudiante = estudiante;
    this.#estado = estado;
    this.#notificacionDiferida = notificacionDiferida;
  }

  /** @returns {IEstadoSolicitud} Objeto estado actual. */
  get estado() {
    return this.#estado;
  }

  /** @returns {string} Nombre del estado actual, apto para persistir o exponer por API. */
  get nombreEstado() {
    return this.#estado.nombre;
  }

  /** @returns {string[]} Acciones que la solicitud acepta en este momento. */
  get accionesPermitidas() {
    return this.#estado.accionesPermitidas;
  }

  /** @returns {Array<{de: string, a: string, fecha: Date}>} Copia del historial de transiciones. */
  get historial() {
    return [...this.#historial];
  }

  /** @returns {INotificacionObserver[]} Copia de la lista de suscriptores. */
  get observers() {
    return [...this.#observers];
  }

  // ---------------------------------------------------------------------------
  // Patrón Observer: gestión de suscriptores
  // ---------------------------------------------------------------------------

  /**
   * Registra un suscriptor a los cambios de estado. Ignora duplicados para que
   * un mismo observer no reciba el aviso dos veces.
   * @param {INotificacionObserver} observer
   * @returns {this} Permite encadenar registros.
   */
  agregarObserver(observer) {
    if (!(observer instanceof INotificacionObserver)) {
      throw new TypeError('El observer debe implementar INotificacionObserver.');
    }

    if (!this.#observers.includes(observer)) {
      this.#observers.push(observer);
    }

    return this;
  }

  /**
   * Da de baja a un suscriptor.
   * @param {INotificacionObserver} observer
   * @returns {boolean} `true` si estaba registrado.
   */
  quitarObserver(observer) {
    const indice = this.#observers.indexOf(observer);
    if (indice === -1) return false;

    this.#observers.splice(indice, 1);
    return true;
  }

  /**
   * Difunde un mensaje a todos los suscriptores.
   *
   * Un observer que falle no interrumpe a los demás ni revierte la transición
   * de estado: que el servidor de correo esté caído no puede impedir que una
   * beca quede aprobada. El error se registra y el proceso continúa.
   *
   * Vale para los dos tipos de falla. Un observer síncrono que lanza se atrapa
   * con `try/catch`; uno asíncrono (un envío de correo real devuelve una
   * promesa) falla DESPUÉS de que el `try` terminó, así que su rechazo se
   * atrapa aparte. Sin eso, el error escaparía como un rechazo no manejado.
   *
   * @param {string} mensaje
   * @param {object} [contexto]
   * @returns {Promise<void>} Se resuelve cuando todos los observers
   *   terminaron. Nunca se rechaza.
   */
  notificar(mensaje, contexto = {}) {
    const entregas = [];

    for (const observer of this.#observers) {
      const registrarFalla = (error) => {
        console.error(
          `[solicitud ${this.id}] el observer ${observer.constructor.name} falló: ${error?.message ?? error}`
        );
      };

      try {
        const resultado = observer.actualizar(mensaje, contexto);
        if (resultado && typeof resultado.then === 'function') {
          entregas.push(Promise.resolve(resultado).catch(registrarFalla));
        }
      } catch (error) {
        registrarFalla(error);
      }
    }

    return Promise.all(entregas).then(() => undefined);
  }

  /**
   * Publica los avisos que una solicitud con notificación diferida guardó al
   * cambiar de estado, en el orden en que ocurrieron. El service la llama
   * después de persistir el estado nuevo.
   *
   * @returns {Promise<void>} Nunca se rechaza: ver {@link notificar}.
   */
  async publicarNotificaciones() {
    const pendientes = this.#pendientes.splice(0);
    for (const { mensaje, contexto } of pendientes) {
      await this.notificar(mensaje, contexto);
    }
  }

  // ---------------------------------------------------------------------------
  // Patrón State: transición y delegación
  // ---------------------------------------------------------------------------

  /**
   * Reemplaza el estado actual, deja constancia en el historial y avisa a los
   * suscriptores. Lo invocan los propios estados cuando aceptan una transición;
   * no debe llamarse desde los controllers para saltarse las reglas.
   *
   * @param {IEstadoSolicitud} nuevoEstado
   */
  cambiarEstado(nuevoEstado) {
    if (!(nuevoEstado instanceof IEstadoSolicitud)) {
      throw new TypeError('El nuevo estado debe ser una instancia de IEstadoSolicitud.');
    }

    const estadoAnterior = this.#estado.nombre;
    this.#estado = nuevoEstado;

    const transicion = { de: estadoAnterior, a: nuevoEstado.nombre, fecha: new Date() };
    this.#historial.push(transicion);

    const mensaje = `Su solicitud de beca cambió de "${estadoAnterior}" a "${nuevoEstado.nombre}".`;
    const contexto = { solicitudId: this.id, estadoAnterior, estadoNuevo: nuevoEstado.nombre };

    if (this.#notificacionDiferida) {
      this.#pendientes.push({ mensaje, contexto });
    } else {
      this.notificar(mensaje, contexto);
    }
  }

  /**
   * Envía la solicitud a revisión. Delega en el estado actual.
   * @throws {import('./TransicionInvalidaError.js').TransicionInvalidaError}
   * @returns {this}
   */
  enviar() {
    this.#estado.enviar(this);
    return this;
  }

  /**
   * Pasa la solicitud a evaluación. Delega en el estado actual.
   * @throws {import('./TransicionInvalidaError.js').TransicionInvalidaError}
   * @returns {this}
   */
  evaluar() {
    this.#estado.evaluar(this);
    return this;
  }

  /**
   * Emite el dictamen del evaluador. Delega en el estado actual.
   * @param {boolean} aprobado
   * @param {{requiereAutorizacion?: boolean}} [opciones] Si la solicitud
   *   necesita además la aprobación de la autoridad autorizadora.
   * @throws {import('./TransicionInvalidaError.js').TransicionInvalidaError}
   * @returns {this}
   */
  dictaminar(aprobado, opciones) {
    this.#estado.dictaminar(this, aprobado, opciones);
    return this;
  }

  /**
   * Autorización final de una solicitud de mayor monto. Delega en el estado
   * actual.
   * @param {boolean} aprobado
   * @throws {import('./TransicionInvalidaError.js').TransicionInvalidaError}
   * @returns {this}
   */
  autorizar(aprobado) {
    this.#estado.autorizar(this, aprobado);
    return this;
  }

  /**
   * Representación plana, apta para responder por API o persistir.
   * @returns {{id: *, estudiante: *, estado: string, accionesPermitidas: string[], historial: Array}}
   */
  toJSON() {
    return {
      id: this.id,
      estudiante: this.estudiante,
      estado: this.nombreEstado,
      accionesPermitidas: this.accionesPermitidas,
      historial: this.historial,
    };
  }
}
