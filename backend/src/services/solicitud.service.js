// Lógica de negocio de Solicitudes.
//
// Este service es el punto donde se integran los patrones implementados:
//   - State          (backend/src/patterns/state)     → qué transiciones son válidas.
//   - Observer       (backend/src/patterns/observer)   → a quién se le avisa del cambio.
//   - Factory Method (backend/src/patterns/creational) → qué modalidad de beca es y
//                                                        qué documentación exige.
//
// Nótese que no hay un solo `if` ni `switch` sobre el estado ni sobre el tipo de
// beca en todo el archivo: el service orquesta (carga, delega, persiste) y las
// reglas viven en los estados y en las clases de modalidad.
import * as solicitudRepository from '../repositories/solicitud.repository.js';
import { Solicitud, crearEstadoDesdeNombre } from '../patterns/state/index.js';
import { EmailNotificationListener } from '../patterns/observer/EmailNotificationListener.js';
import { SolicitudFactory } from '../patterns/creational/SolicitudFactory.js';

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
 * Crea una solicitud nueva, en estado Borrador, para una modalidad de beca.
 *
 * Aquí se cruzan dos patrones: el Factory Method resuelve *qué* beca es y qué
 * documentos exigirá, y el State fija el punto de partida del ciclo de vida
 * (Borrador). La modalidad se valida antes de escribir en base de datos, de
 * modo que un tipo inexistente no deja una solicitud huérfana.
 *
 * El tipo es obligatorio: una solicitud sin modalidad no tiene requisitos de
 * documentación y por tanto su expediente no sería validable después.
 *
 * @param {number} estudianteId
 * @param {string} tipo Modalidad de beca; ver {@link tiposDeBeca}.
 * @returns {Promise<object>} La solicitud creada, con su estado y la
 *   documentación que el estudiante deberá reunir.
 * @throws {Error & { status: number }} 400 si la modalidad no existe.
 */
export async function crearSolicitud(estudianteId, tipo) {
  const modalidad = SolicitudFactory.crearSolicitud(tipo);
  const borrador = new Solicitud({ estudiante: estudianteId });

  // ponytail: la fila solo guarda el estado. La modalidad se devuelve pero no se
  // persiste porque `solicitudes` no tiene columna `tipo`; persistirla cuando
  // el esquema la tenga.
  const fila = await solicitudRepository.crear(estudianteId, borrador.nombreEstado);

  borrador.id = fila.id;
  return { ...borrador.toJSON(), ...modalidad.toJSON() };
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

/**
 * Modalidades de beca disponibles, para que el frontend arme el selector sin
 * tener la lista duplicada.
 * @returns {string[]}
 */
export function tiposDeBeca() {
  return SolicitudFactory.tiposDisponibles();
}

/**
 * Documentación exigida por una modalidad, sin iniciar ninguna solicitud.
 * @param {string} tipo
 * @returns {string[]}
 * @throws {Error & { status: number }} 400 si la modalidad no existe.
 */
export function documentosRequeridos(tipo) {
  return SolicitudFactory.crearSolicitud(tipo).documentosRequeridos;
}
