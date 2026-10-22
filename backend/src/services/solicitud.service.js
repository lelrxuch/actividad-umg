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
import { autorizar, ACCIONES } from './solicitud.autorizacion.js';
import { exigirConvocatoriaAbierta } from './convocatoria.service.js';

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

  // Antes de tocar el estado: ¿tiene derecho quien lo pide? Va acá y no en
  // cada función de abajo para que no se pueda agregar una transición nueva
  // sin control de acceso.
  await autorizar(opciones.accionAutorizada, fila, opciones.usuario);

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
export async function crearSolicitud(estudianteId, tipo, { convocatoriaId = null } = {}) {
  const modalidad = SolicitudFactory.crearSolicitud(tipo);

  // La convocatoria es opcional: se puede solicitar una beca fuera de
  // convocatoria. Cuando viene, tiene que estar publicada, dentro de su periodo
  // y admitir esta modalidad; lo comprueba convocatoria.service antes de que se
  // escriba la fila, para no dejar una solicitud colgada de una convocatoria
  // cerrada.
  if (convocatoriaId !== null && convocatoriaId !== undefined) {
    await exigirConvocatoriaAbierta(convocatoriaId, tipo);
  }

  const borrador = new Solicitud({ estudiante: estudianteId });

  // `tipo` se persiste desde SCRUM-32: la columna existe desde la migración de
  // SCRUM-59 pero no se estaba llenando, así que toda solicitud quedaba con
  // tipo NULL. Eso dejaba sin efecto la validación de tipo de documento de
  // SCRUM-42, que deduce de ahí qué papeles admite el expediente.
  const fila = await solicitudRepository.crear(estudianteId, borrador.nombreEstado, {
    tipo,
    convocatoriaId: convocatoriaId ?? null,
  });

  borrador.id = fila.id;
  return {
    ...borrador.toJSON(),
    ...modalidad.toJSON(),
    convocatoriaId: fila.convocatoria_id ?? null,
  };
}

/**
 * Consulta una solicitud y las acciones que admite en su estado actual.
 * @param {number} id
 * @returns {Promise<object>}
 */
export async function obtenerSolicitud(id, usuario) {
  const fila = await solicitudRepository.findById(id);

  if (!fila) {
    const error = new Error(`No existe la solicitud ${id}.`);
    error.status = 404;
    throw error;
  }

  await autorizar(ACCIONES.VER, fila, usuario);

  return hidratar(fila).toJSON();
}

/**
 * Borrador → Enviada. Notifica al estudiante.
 * @param {number} id
 * @param {object} [opciones]
 */
export function enviarSolicitud(id, opciones = {}) {
  return aplicarTransicion(id, (solicitud) => solicitud.enviar(), {
    ...opciones,
    accionAutorizada: ACCIONES.ENVIAR,
  });
}

/**
 * Enviada → En Evaluación. Notifica al estudiante.
 * @param {number} id
 * @param {object} [opciones]
 */
export function evaluarSolicitud(id, opciones = {}) {
  return aplicarTransicion(id, (solicitud) => solicitud.evaluar(), {
    ...opciones,
    accionAutorizada: ACCIONES.EVALUAR,
  });
}

/**
 * En Evaluación → Aprobada | Rechazada. Notifica al estudiante.
 * @param {number} id
 * @param {boolean} aprobado
 * @param {object} [opciones]
 */
export function dictaminarSolicitud(id, aprobado, opciones = {}) {
  return aplicarTransicion(id, (solicitud) => solicitud.dictaminar(aprobado), {
    ...opciones,
    accionAutorizada: ACCIONES.DICTAMINAR,
  });
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
