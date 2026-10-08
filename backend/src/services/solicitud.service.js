// Lógica de negocio de Solicitudes.
//
// Este service es el punto donde se integran los dos patrones de comportamiento:
//   - State    (backend/src/patterns/state)    → decide qué transiciones son válidas.
//   - Observer (backend/src/patterns/observer) → decide a quién se le avisa del cambio.
//
// Nótese que no hay un solo `if` ni `switch` sobre el estado en todo el archivo:
// el service orquesta (carga, delega, persiste) y las reglas viven en los estados.
import * as solicitudRepository from '../repositories/solicitud.repository.js';
import { Solicitud, crearEstadoDesdeNombre } from '../patterns/state/index.js';
import { EmailNotificationListener } from '../patterns/observer/EmailNotificationListener.js';

/**
 * Reconstruye el objeto de dominio a partir de la fila de base de datos y le
 * engancha los suscriptores que deben enterarse de sus cambios de estado.
 *
 * @param {{id: number, estudiante_id: number, estado: string}} fila
 * @param {{correoEstudiante?: string, transporteCorreo?: Function}} [opciones]
 * @returns {Solicitud}
 */
function hidratar(fila, { correoEstudiante, transporteCorreo } = {}) {
  const solicitud = new Solicitud({
    id: fila.id,
    estudiante: fila.estudiante_id,
    estado: crearEstadoDesdeNombre(fila.estado),
  });

  if (correoEstudiante) {
    solicitud.agregarObserver(
      new EmailNotificationListener(correoEstudiante, { transporte: transporteCorreo })
    );
  }

  return solicitud;
}

/**
 * Carga una solicitud, le aplica una acción del ciclo de vida y persiste el
 * estado resultante.
 *
 * Si la acción no es válida desde el estado actual, el objeto estado lanza
 * TransicionInvalidaError (status 409) y no se escribe nada en base de datos.
 *
 * @param {number} id
 * @param {(solicitud: Solicitud) => void} accion
 * @param {object} [opciones] Ver {@link hidratar}.
 * @returns {Promise<object>} La solicitud ya actualizada, en formato plano.
 */
async function aplicarTransicion(id, accion, opciones = {}) {
  const fila = await solicitudRepository.findById(id);

  if (!fila) {
    const error = new Error(`No existe la solicitud ${id}.`);
    error.status = 404;
    throw error;
  }

  const solicitud = hidratar(fila, opciones);

  // Aquí ocurre la delegación del patrón State. Si la transición es inválida,
  // esto lanza y el `actualizarEstado` de abajo nunca se ejecuta.
  accion(solicitud);

  // La transición fue aceptada: los observers ya fueron notificados por
  // Solicitud#cambiarEstado. Solo queda persistir el estado nuevo.
  await solicitudRepository.actualizarEstado(solicitud.id, solicitud.nombreEstado);

  return solicitud.toJSON();
}

/**
 * Crea una solicitud nueva en estado Borrador.
 * @param {number} estudianteId
 * @returns {Promise<object>}
 */
export async function crearSolicitud(estudianteId) {
  const borrador = new Solicitud({ estudiante: estudianteId });
  const fila = await solicitudRepository.crear(estudianteId, borrador.nombreEstado);

  borrador.id = fila.id;
  return borrador.toJSON();
}

/**
 * Consulta una solicitud y las acciones que admite en su estado actual.
 * @param {number} id
 * @returns {Promise<object>}
 */
export async function obtenerSolicitud(id) {
  const fila = await solicitudRepository.findById(id);

  if (!fila) {
    const error = new Error(`No existe la solicitud ${id}.`);
    error.status = 404;
    throw error;
  }

  return hidratar(fila).toJSON();
}

/**
 * Borrador → Enviada. Notifica al estudiante.
 * @param {number} id
 * @param {object} [opciones]
 */
export function enviarSolicitud(id, opciones) {
  return aplicarTransicion(id, (solicitud) => solicitud.enviar(), opciones);
}

/**
 * Enviada → En Evaluación. Notifica al estudiante.
 * @param {number} id
 * @param {object} [opciones]
 */
export function evaluarSolicitud(id, opciones) {
  return aplicarTransicion(id, (solicitud) => solicitud.evaluar(), opciones);
}

/**
 * En Evaluación → Aprobada | Rechazada. Notifica al estudiante.
 * @param {number} id
 * @param {boolean} aprobado
 * @param {object} [opciones]
 */
export function dictaminarSolicitud(id, aprobado, opciones) {
  return aplicarTransicion(id, (solicitud) => solicitud.dictaminar(aprobado), opciones);
}
