// Lógica de negocio de Solicitudes.
//
// Este service es el punto donde se integran los patrones implementados:
//   - State          (backend/src/patterns/state)     → qué transiciones son válidas.
//   - Observer       (backend/src/patterns/observer)   → a quién se le avisa del cambio.
//   - Factory Method (backend/src/patterns/creational) → qué modalidad de beca es y
//                                                        qué documentación exige.
//   - Adapter        (vía identidad.service)           → si el CUI con que se envía
//                                                        existe en RENAP (SCRUM-38).
//
// Nótese que no hay un solo `if` ni `switch` sobre el estado ni sobre el tipo de
// beca en todo el archivo: el service orquesta (carga, delega, persiste) y las
// reglas viven en los estados y en las clases de modalidad.
import * as solicitudRepository from '../repositories/solicitud.repository.js';
import { Solicitud, crearEstadoDesdeNombre } from '../patterns/state/index.js';
import { EmailNotificationListener } from '../patterns/observer/EmailNotificationListener.js';
import { NotificacionRegistradaListener } from '../patterns/observer/NotificacionRegistradaListener.js';
import * as notificacionRepository from '../repositories/notificacion.repository.js';
import { SolicitudFactory } from '../patterns/creational/SolicitudFactory.js';
import {
  autorizar,
  ACCIONES,
  bandejaDe,
  BANDEJA,
  exigirAdministrador,
} from './solicitud.autorizacion.js';
import { exigirConvocatoriaAbierta } from './convocatoria.service.js';
import { listarDeSolicitud } from '../repositories/documento.repository.js';
import * as usuarioRepository from '../repositories/usuario.repository.js';
import { validarIdentidadConNombre } from './identidad.service.js';
import { IdentidadNoValidaError } from '../patterns/structural/ErroresIdentidad.js';

/**
 * Único mensaje para un CUI que no existe en RENAP o que no es del dueño de la
 * solicitud (ver exigirIdentidad).
 */
export const MENSAJE_IDENTIDAD_NO_VERIFICADA =
  'No se pudo verificar su identidad con el CUI ingresado. Revise que sea el de su DPI y que coincida con el nombre de su cuenta.';

function errorDeNegocio(mensaje, status, extra = {}) {
  const error = new Error(mensaje);
  error.status = status;
  Object.assign(error, extra);
  return error;
}

/**
 * La forma en que una solicitud sale del service, siempre la misma.
 *
 * Antes crear devolvía la modalidad y los documentos requeridos, pero consultar
 * y transicionar no: el cliente recibía formas distintas de la misma entidad y
 * desde el detalle no podía saber qué documentos pedir.
 */
function formatoPublico(fila, solicitud = hidratar(fila)) {
  const modalidad = fila.tipo ? SolicitudFactory.crearSolicitud(fila.tipo).toJSON() : {};
  return {
    ...solicitud.toJSON(),
    ...modalidad,
    convocatoriaId: fila.convocatoria_id ?? null,
  };
}

/**
 * SCRUM-39: no se envía un expediente incompleto.
 *
 * Compara los documentos subidos contra los que exige la modalidad (Factory
 * Method). Responde 400 con `faltantes`, el mismo contrato que la revisión de
 * expediente, para que el cliente muestre exactamente qué falta.
 */
async function exigirExpedienteCompleto(fila) {
  if (!fila.tipo) {
    throw errorDeNegocio(
      `La solicitud ${fila.id} no tiene modalidad de beca, así que su expediente no se puede validar.`,
      400
    );
  }

  const requeridos = SolicitudFactory.crearSolicitud(fila.tipo).documentosRequeridos;
  const presentes = new Set((await listarDeSolicitud(fila.id)).map((d) => d.tipo));
  const faltantes = requeridos.filter((tipo) => !presentes.has(tipo));

  if (faltantes.length > 0) {
    throw errorDeNegocio(
      `El expediente está incompleto. Falta: ${faltantes.join(', ')}.`,
      400,
      { faltantes }
    );
  }
}

/**
 * SCRUM-38: no se envía con una identidad inexistente ni ajena.
 *
 * El CUI se pide al enviar porque el sistema no lo guardaba en ningún lado. Se
 * valida contra RENAP y además se compara el nombre de RENAP con el del dueño
 * de la solicitud, para que nadie envíe con el CUI de otra persona.
 *
 * Es la última comprobación del envío porque es la única que sale a la red.
 * Sus errores ya traen status: 400 si el CUI está mal o no existe, 503 si RENAP
 * no respondió. En cualquiera de los dos el estado no cambia y se puede volver
 * a intentar.
 *
 * "El CUI no existe" y "el CUI es de otra persona" responden el MISMO mensaje
 * ({@link MENSAJE_IDENTIDAD_NO_VERIFICADA}). Con dos mensajes distintos, quien
 * prueba CUIs ajenos sabría cuáles existen en RENAP, y el de "no coincide"
 * confirmaría que el CUI es de alguien real. Solo el error de formato se
 * muestra tal cual: no consulta el registro, así que no revela nada, y le dice
 * al estudiante qué corregir.
 *
 * @returns {Promise<{cui: string}>} El CUI ya normalizado, para registrarlo.
 */
async function exigirIdentidad(fila, cui, validador) {
  const estudiante = await usuarioRepository.findById(fila.estudiante_id);

  let identidad;
  try {
    identidad = await validarIdentidadConNombre(cui, estudiante?.nombre, validador ? { validador } : {});
  } catch (error) {
    if (error instanceof IdentidadNoValidaError && !error.formatoInvalido) {
      throw errorDeNegocio(MENSAJE_IDENTIDAD_NO_VERIFICADA, 400);
    }
    throw error;
  }

  if (!identidad.coincideNombre) {
    throw errorDeNegocio(MENSAJE_IDENTIDAD_NO_VERIFICADA, 400);
  }

  return { cui: identidad.cui };
}

/**
 * Reconstruye el objeto de dominio a partir de la fila de base de datos y le
 * engancha los suscriptores que deben enterarse de sus cambios de estado.
 *
 * @param {{id: number, estudiante_id: number, estado: string}} fila
 * @param {{correoEstudiante?: string, transporteCorreo?: Function}} [opciones]
 * @returns {Solicitud}
 */
function hidratar(fila, { correoEstudiante, transporteCorreo, paraTransicion = false } = {}) {
  const solicitud = new Solicitud({
    id: fila.id,
    estudiante: fila.estudiante_id,
    estado: crearEstadoDesdeNombre(fila.estado),
    notificacionDiferida: paraTransicion,
  });

  // Toda transición avisa al estudiante dueño, dentro de la aplicación. Cada
  // canal es un observer más: agregar uno no toca este service.
  if (paraTransicion) {
    solicitud.agregarObserver(
      new NotificacionRegistradaListener({
        destinatarioId: fila.estudiante_id,
        canal: 'app',
        repositorio: notificacionRepository,
      })
    );
  }

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

  const solicitud = hidratar(fila, { ...opciones, paraTransicion: true });

  // Precondición propia de la acción (hoy: expediente completo e identidad
  // para enviar). Solo corre si el ESTADO admite la acción: reenviar una
  // solicitud ya enviada tiene que dar 409 por el estado, no 400 por los
  // documentos. Lo que devuelva se persiste junto con el estado nuevo.
  let registro;
  if (opciones.precondicion && solicitud.accionesPermitidas.includes(opciones.accionAutorizada)) {
    registro = await opciones.precondicion(fila);
  }

  // Aquí ocurre la delegación del patrón State. Si la transición es inválida,
  // esto lanza y el `actualizarEstado` de abajo nunca se ejecuta.
  accion(solicitud);

  // La transición fue aceptada. Primero se guarda el estado nuevo y SOLO
  // DESPUÉS se avisa: si la escritura falla, nadie recibe el aviso de un
  // estado que no existe; si el aviso falla, el estado ya quedó guardado.
  await solicitudRepository.actualizarEstado(
    solicitud.id,
    solicitud.nombreEstado,
    ...(registro ? [registro] : [])
  );

  // Nunca lanza: una falla de cualquier canal se atrapa y se registra
  // (Solicitud#notificar y NotificacionRegistradaListener).
  await solicitud.publicarNotificaciones();

  return formatoPublico(fila, solicitud);
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

    // SCRUM-36: una sola solicitud vigente por convocatoria.
    const existente = await solicitudRepository.vigenteEnConvocatoria(estudianteId, convocatoriaId);
    if (existente !== null) {
      throw errorDeNegocio(
        `Ya tiene la solicitud ${existente} en esta convocatoria.`,
        409,
        { solicitudExistente: existente }
      );
    }
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
 * Las solicitudes de quien pregunta, en el mismo formato que el detalle.
 *
 * Vive aquí y no en el controller: antes el controller llamaba directo al
 * repositorio, saltándose esta capa.
 *
 * @param {{id: *}} usuario
 * @returns {Promise<object[]>}
 */
export async function listarMisSolicitudes(usuario) {
  if (!usuario || usuario.id === undefined || usuario.id === null) {
    throw errorDeNegocio('No se identificó a quien solicita la acción.', 403);
  }

  const filas = await solicitudRepository.listarPorEstudiante(usuario.id);
  return filas.map((fila) => formatoPublico(fila));
}

/**
 * La bandeja de revisión: lo que un evaluador tiene asignado, o lo que espera
 * revisión si pregunta un administrador. De la más vieja a la más nueva, en el
 * mismo formato que el detalle.
 *
 * @param {{id: *, rol: string}} usuario
 * @returns {Promise<object[]>}
 * @throws {Error & { status: number }} 403 a un estudiante o sin usuario.
 */
export async function listarAsignadas(usuario) {
  const filas =
    bandejaDe(usuario) === BANDEJA.ASIGNADAS
      ? await solicitudRepository.listarAsignadasA(usuario.id)
      : await solicitudRepository.listarEnRevision();

  return filas.map((fila) => formatoPublico(fila));
}

/**
 * Asigna un evaluador a una solicitud. Es lo que llena la bandeja de
 * {@link listarAsignadas} y lo que consulta la autorización para dejarlo
 * evaluar, dictaminar y ver el expediente.
 *
 * El orden de las comprobaciones es deliberado: quién (403), qué se pidió
 * (400), si la solicitud existe (404), si el usuario es evaluador (400), si el
 * estado admite evaluadores (409) y, al final, si ya estaba asignado (409),
 * que es lo único que escribe.
 *
 * Solo Enviada y En Evaluación admiten evaluadores; lo decide el estado
 * (IEstadoSolicitud#admiteEvaluadores), no este service.
 *
 * @param {number} solicitudId
 * @param {*} evaluadorId Id del usuario a asignar, tal como llegó en el body.
 * @param {{id: *, rol: string}} usuario Quien pide la asignación.
 * @returns {Promise<{solicitudId: number, evaluador: {id: number, nombre: string, email: string}}>}
 */
export async function asignarEvaluador(solicitudId, evaluadorId, usuario) {
  exigirAdministrador(usuario);

  const idEvaluador = Number(evaluadorId);
  if (!Number.isInteger(idEvaluador) || idEvaluador <= 0) {
    throw errorDeNegocio('El campo "evaluadorId" es requerido y debe ser un id de usuario.', 400);
  }

  const fila = await solicitudRepository.findById(solicitudId);
  if (!fila) {
    throw errorDeNegocio(`No existe la solicitud ${solicitudId}.`, 404);
  }

  // Un id que no existe responde lo mismo que uno de otro rol: en los dos
  // casos lo que falla es el body, no la ruta.
  const evaluador = await usuarioRepository.findById(idEvaluador);
  if (!evaluador || evaluador.rol !== 'evaluador') {
    throw errorDeNegocio(`El usuario ${idEvaluador} no es evaluador.`, 400);
  }

  if (!crearEstadoDesdeNombre(fila.estado).admiteEvaluadores) {
    throw errorDeNegocio(
      `No se asignan evaluadores a una solicitud en estado ${fila.estado}: solo en Enviada o En Evaluación.`,
      409
    );
  }

  const asignado = await solicitudRepository.asignarEvaluador(fila.id, evaluador.id);
  if (!asignado) {
    throw errorDeNegocio(
      `El usuario ${evaluador.id} ya está asignado como evaluador de la solicitud ${fila.id}.`,
      409
    );
  }

  return {
    solicitudId: fila.id,
    evaluador: { id: evaluador.id, nombre: evaluador.nombre, email: evaluador.email },
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

  return formatoPublico(fila);
}

/**
 * Borrador → Enviada. Notifica al estudiante.
 *
 * El orden de las comprobaciones es deliberado: quién (403), estado (409),
 * expediente (400) y RENAP al final (400 o 503), que es la llamada externa.
 *
 * @param {number} id
 * @param {object} [opciones]
 * @param {string} [opciones.cui] CUI del estudiante, con o sin separadores.
 * @param {import('../patterns/structural/IValidacionIdentidad.js').IValidacionIdentidad}
 *   [opciones.validadorIdentidad] Se inyecta en las pruebas; por defecto, RENAP.
 */
export function enviarSolicitud(id, { cui, validadorIdentidad, ...opciones } = {}) {
  return aplicarTransicion(id, (solicitud) => solicitud.enviar(), {
    ...opciones,
    accionAutorizada: ACCIONES.ENVIAR,
    precondicion: async (fila) => {
      await exigirExpedienteCompleto(fila);
      return exigirIdentidad(fila, cui, validadorIdentidad);
    },
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
