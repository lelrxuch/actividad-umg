// Quién puede hacer qué con una solicitud (corrección de SCRUM-35).
//
// POR QUÉ ESTE MÓDULO EXISTE:
// `autenticado` solo confirma que hay sesión. Sin nada más, cualquier usuario
// con token podía enviar, evaluar y dictaminar CUALQUIER solicitud por su id:
// un estudiante podía aprobar su propia beca o rechazar la de otro.
//
// Las reglas viven acá y no en el controller para que solicitud.service siga
// siendo un orquestador, y para que haya un solo lugar donde leerlas. Es el
// equivalente, para solicitudes, de lo que DocumentoProxy hace con la lectura
// de documentos: el patrón no aplica igual porque acá no se protege el acceso
// a un objeto costoso, sino el derecho a provocar una transición.
//
// Falla cerrado: sin un usuario identificable, no se autoriza nada.
import { evaluadoresDeSolicitud } from '../repositories/documento.repository.js';

/** Acciones del ciclo de vida que esta capa controla. */
export const ACCIONES = Object.freeze({
  VER: 'ver',
  ENVIAR: 'enviar',
  EVALUAR: 'evaluar',
  DICTAMINAR: 'dictaminar',
});

/** Compara identificadores que pueden venir como número o como cadena. */
function mismoId(a, b) {
  return a !== undefined && a !== null && String(a) === String(b);
}

function denegar(mensaje) {
  const error = new Error(mensaje);
  error.status = 403;
  throw error;
}

/** Qué ve cada rol en la bandeja de revisión (GET /api/solicitudes/asignadas). */
export const BANDEJA = Object.freeze({
  ASIGNADAS: 'asignadas',
  EN_REVISION: 'en-revision',
});

/**
 * Decide qué bandeja de revisión le corresponde a quien pregunta, o lanza 403.
 *
 * Evaluador: solo lo que tiene asignado. Administrador: todo lo que espera
 * revisión. Un estudiante no tiene bandeja: sus solicitudes están en
 * GET /api/solicitudes.
 *
 * @param {{id: *, rol: string}} [usuario]
 * @returns {string} Una de {@link BANDEJA}.
 * @throws {Error & { status: number }} 403 si no es evaluador ni administrador.
 */
export function bandejaDe(usuario) {
  if (!usuario || usuario.id === undefined || usuario.id === null) {
    denegar('No se identificó a quien solicita la acción.');
  }

  if (usuario.rol === 'administrador') return BANDEJA.EN_REVISION;
  if (usuario.rol === 'evaluador') return BANDEJA.ASIGNADAS;

  denegar('Solo evaluadores y administradores tienen bandeja de revisión.');
}

/**
 * Autoriza una acción sobre una solicitud, o lanza 403.
 *
 * @param {string} accion Una de {@link ACCIONES}.
 * @param {{id: number, estudiante_id: number}} fila La solicitud, ya cargada.
 * @param {{id: *, rol: string}} [usuario] Quien pide la acción.
 * @returns {Promise<void>}
 * @throws {Error & { status: number }} 403 si no tiene derecho.
 */
export async function autorizar(accion, fila, usuario) {
  if (!usuario || usuario.id === undefined || usuario.id === null) {
    denegar('No se identificó a quien solicita la acción.');
  }

  const esDueno = mismoId(usuario.id, fila.estudiante_id);
  const esAdministrador = usuario.rol === 'administrador';

  if (esAdministrador) {
    return;
  }

  // Enviar es del estudiante: es él quien decide que su expediente está listo.
  if (accion === ACCIONES.ENVIAR) {
    if (!esDueno) {
      denegar('No puede enviar una solicitud ajena.');
    }
    return;
  }

  // Evaluar y dictaminar son del evaluador, y solo de uno asignado a ESTA
  // solicitud. La asignación ya existe en solicitud_evaluadores y es la misma
  // que consulta DocumentoProxy para decidir quién ve el expediente.
  if (accion === ACCIONES.EVALUAR || accion === ACCIONES.DICTAMINAR) {
    if (usuario.rol !== 'evaluador') {
      denegar('Solo un evaluador asignado puede evaluar o dictaminar la solicitud.');
    }

    const asignados = await evaluadoresDeSolicitud(fila.id);
    if (!asignados.some((id) => mismoId(id, usuario.id))) {
      denegar('No está asignado como evaluador de esta solicitud.');
    }
    return;
  }

  // Ver: el dueño, o un evaluador asignado.
  if (accion === ACCIONES.VER) {
    if (esDueno) {
      return;
    }

    if (usuario.rol === 'evaluador') {
      const asignados = await evaluadoresDeSolicitud(fila.id);
      if (asignados.some((id) => mismoId(id, usuario.id))) {
        return;
      }
    }

    denegar('No tiene acceso a esta solicitud.');
  }

  denegar('Acción no reconocida.');
}
