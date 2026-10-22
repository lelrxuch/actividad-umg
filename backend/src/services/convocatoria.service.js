// Lógica de negocio de Convocatorias (SCRUM-32, SCRUM-33).
//
// Integra dos patrones ya existentes en el proyecto:
//   - State          (patterns/state/convocatoria) → qué transiciones son válidas
//                                                    y si admite solicitudes o edición.
//   - Factory Method (patterns/creational)         → qué modalidades de beca existen.
//
// No hay un solo `if` ni `switch` sobre el estado: el service orquesta y las
// reglas de ciclo de vida viven en las clases de estado. Lo que sí vive acá son
// las reglas sobre los DATOS: qué hace falta para poder publicar, y qué
// modalidades son válidas. Esa distinción es deliberada — el estado sabe desde
// dónde se puede publicar, no si la convocatoria está completa.
import * as convocatoriaRepository from '../repositories/convocatoria.repository.js';
import { Convocatoria, crearEstadoDesdeNombre } from '../patterns/state/convocatoria/index.js';
import { SolicitudFactory } from '../patterns/creational/SolicitudFactory.js';

function errorDeNegocio(mensaje, status) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

/** Solo el administrador escribe convocatorias. */
function exigirAdministrador(usuario) {
  if (usuario?.rol !== 'administrador') {
    throw errorDeNegocio('Solo un administrador puede gestionar convocatorias.', 403);
  }
}

/**
 * Reconstruye el objeto de dominio a partir de la fila de base de datos.
 * @param {object} fila
 * @returns {Convocatoria}
 */
function hidratar(fila) {
  return new Convocatoria({
    id: fila.id,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    fechaApertura: fila.fecha_apertura,
    fechaCierre: fila.fecha_cierre,
    modalidades: fila.modalidades || [],
    estado: crearEstadoDesdeNombre(fila.estado),
  });
}

/**
 * Valida las modalidades contra el Factory.
 *
 * La lista válida no se escribe acá: se le pregunta a SolicitudFactory, igual
 * que en solicitud.service. Agregar una beca nueva la admite sin tocar este
 * archivo.
 *
 * @param {string[]} modalidades
 * @throws {Error & { status: number }} 400 si alguna no existe.
 */
function validarModalidades(modalidades) {
  if (!Array.isArray(modalidades)) {
    throw errorDeNegocio('Las modalidades deben venir como lista.', 400);
  }

  const validas = SolicitudFactory.tiposDisponibles();
  const desconocidas = modalidades.filter((tipo) => !validas.includes(tipo));

  if (desconocidas.length) {
    throw errorDeNegocio(
      `Modalidad desconocida: ${desconocidas.join(', ')}. Válidas: ${validas.join(', ')}.`,
      400
    );
  }
}

/** Normaliza una fecha de entrada a 'YYYY-MM-DD' o null. */
function comoFecha(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return null;

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    throw errorDeNegocio(`${campo} no es una fecha válida.`, 400);
  }

  return fecha.toISOString().slice(0, 10);
}

/**
 * Qué le falta a una convocatoria para poder publicarse.
 *
 * Devuelve la lista en vez de lanzar, por la misma razón que el expediente:
 * el administrador necesita saber qué completar, no solo que no puede.
 *
 * @param {Convocatoria} convocatoria
 * @returns {string[]}
 */
export function faltantesParaPublicar(convocatoria) {
  const faltantes = [];

  if (!convocatoria.titulo || !convocatoria.titulo.trim()) faltantes.push('titulo');
  if (!convocatoria.fechaApertura) faltantes.push('fechaApertura');
  if (!convocatoria.fechaCierre) faltantes.push('fechaCierre');
  if (!convocatoria.modalidades.length) faltantes.push('modalidades');

  return faltantes;
}

/**
 * Crea una convocatoria en Borrador.
 *
 * @param {object} datos
 * @param {{id: *, rol: string}} usuario
 * @returns {Promise<object>}
 * @throws {Error & { status: number }} 403 si no es administrador, 400 si los
 *   datos no son válidos.
 */
export async function crearConvocatoria(datos, usuario) {
  exigirAdministrador(usuario);

  const titulo = String(datos?.titulo ?? '').trim();
  if (!titulo) {
    throw errorDeNegocio('El título de la convocatoria es obligatorio.', 400);
  }

  const modalidades = datos?.modalidades ?? [];
  validarModalidades(modalidades);

  const fechaApertura = comoFecha(datos?.fechaApertura, 'fechaApertura');
  const fechaCierre = comoFecha(datos?.fechaCierre, 'fechaCierre');

  if (fechaApertura && fechaCierre && fechaCierre < fechaApertura) {
    throw errorDeNegocio('La fecha de cierre no puede ser anterior a la de apertura.', 400);
  }

  // El estado inicial lo fija el patrón State, no esta función.
  const borrador = new Convocatoria({ titulo, modalidades });

  const fila = await convocatoriaRepository.crear({
    titulo,
    descripcion: datos?.descripcion ?? null,
    fechaApertura,
    fechaCierre,
    modalidades,
    estado: borrador.nombreEstado,
    creadaPor: usuario?.id ?? null,
  });

  return hidratar(fila).toJSON();
}

/**
 * Carga una convocatoria o lanza 404.
 * @param {number} id
 * @returns {Promise<Convocatoria>}
 */
async function cargar(id) {
  const fila = await convocatoriaRepository.findById(id);

  if (!fila) {
    throw errorDeNegocio(`No existe la convocatoria ${id}.`, 404);
  }

  return hidratar(fila);
}

/**
 * Consulta una convocatoria y las acciones que admite.
 * @param {number} id
 * @returns {Promise<object>}
 */
export async function obtenerConvocatoria(id) {
  const convocatoria = await cargar(id);
  return {
    ...convocatoria.toJSON(),
    solicitudes: await convocatoriaRepository.contarSolicitudes(id),
  };
}

/**
 * Lista convocatorias.
 *
 * Sin usuario, o con uno que no es administrador, solo devuelve las publicadas:
 * un borrador es trabajo interno del administrador y no debe verse desde fuera.
 *
 * @param {{id: *, rol: string}} [usuario]
 * @param {{estado?: string}} [filtro]
 * @returns {Promise<object[]>}
 */
export async function listarConvocatorias(usuario, filtro = {}) {
  const esAdministrador = usuario?.rol === 'administrador';
  const estado = esAdministrador ? filtro.estado : 'Publicada';

  const filas = await convocatoriaRepository.listar({ estado });
  return filas.map((fila) => hidratar(fila).toJSON());
}

/**
 * Edita los datos de una convocatoria.
 *
 * Que se pueda editar lo decide el estado (`admiteEdicion`), no un `if` acá:
 * una convocatoria publicada no se edita porque los estudiantes ya la vieron.
 *
 * @param {number} id
 * @param {object} datos
 * @param {{id: *, rol: string}} usuario
 * @returns {Promise<object>}
 */
export async function editarConvocatoria(id, datos, usuario) {
  exigirAdministrador(usuario);

  const convocatoria = await cargar(id);

  if (!convocatoria.admiteEdicion) {
    throw errorDeNegocio(
      `Una convocatoria en "${convocatoria.nombreEstado}" no se puede editar.`,
      409
    );
  }

  const titulo =
    datos?.titulo === undefined ? convocatoria.titulo : String(datos.titulo).trim();
  const modalidades = datos?.modalidades ?? convocatoria.modalidades;
  validarModalidades(modalidades);

  const fechaApertura =
    datos?.fechaApertura === undefined
      ? convocatoria.fechaApertura
      : comoFecha(datos.fechaApertura, 'fechaApertura');
  const fechaCierre =
    datos?.fechaCierre === undefined
      ? convocatoria.fechaCierre
      : comoFecha(datos.fechaCierre, 'fechaCierre');

  const fila = await convocatoriaRepository.actualizarDatos(id, {
    titulo,
    descripcion: datos?.descripcion === undefined ? convocatoria.descripcion : datos.descripcion,
    fechaApertura,
    fechaCierre,
    modalidades,
  });

  return hidratar(fila).toJSON();
}

/**
 * Borrador → Publicada.
 *
 * Dos comprobaciones distintas y en este orden: primero si la convocatoria está
 * COMPLETA (regla sobre los datos, vive acá) y después si el estado admite la
 * transición (regla de ciclo de vida, la decide el State). Al revés, publicar
 * dos veces una convocatoria incompleta daría el error equivocado.
 *
 * @param {number} id
 * @param {{id: *, rol: string}} usuario
 * @returns {Promise<object>}
 * @throws {Error & { status: number }} 400 con `faltantes` si está incompleta,
 *   409 si el estado no admite publicar.
 */
export async function publicarConvocatoria(id, usuario) {
  exigirAdministrador(usuario);

  const convocatoria = await cargar(id);
  const faltantes = faltantesParaPublicar(convocatoria);

  if (faltantes.length) {
    const error = errorDeNegocio(
      `La convocatoria está incompleta. Falta: ${faltantes.join(', ')}.`,
      400
    );
    error.faltantes = faltantes;
    throw error;
  }

  convocatoria.publicar();
  const fila = await convocatoriaRepository.actualizarEstado(id, convocatoria.nombreEstado);

  return hidratar(fila).toJSON();
}

/**
 * Publicada → Cerrada.
 * @param {number} id
 * @param {{id: *, rol: string}} usuario
 * @returns {Promise<object>}
 */
export async function cerrarConvocatoria(id, usuario) {
  exigirAdministrador(usuario);

  const convocatoria = await cargar(id);
  convocatoria.cerrar();
  const fila = await convocatoriaRepository.actualizarEstado(id, convocatoria.nombreEstado);

  return hidratar(fila).toJSON();
}

/**
 * Comprueba que una convocatoria acepte una solicitud de esa modalidad.
 *
 * La llama solicitud.service cuando se crea una solicitud con convocatoria. Las
 * tres preguntas se las responde el dominio: el estado dice si admite
 * solicitudes, la convocatoria dice si está en ventana y si admite la
 * modalidad.
 *
 * @param {number} convocatoriaId
 * @param {string} tipo Modalidad de beca pedida.
 * @returns {Promise<void>}
 * @throws {Error & { status: number }} 404 si no existe, 409 si no admite
 *   solicitudes o está fuera de ventana, 400 si no admite esa modalidad.
 */
export async function exigirConvocatoriaAbierta(convocatoriaId, tipo) {
  const convocatoria = await cargar(convocatoriaId);

  if (!convocatoria.admiteSolicitudes) {
    throw errorDeNegocio(
      `La convocatoria ${convocatoriaId} está en "${convocatoria.nombreEstado}" y no admite solicitudes.`,
      409
    );
  }

  if (!convocatoria.estaEnVentana()) {
    throw errorDeNegocio(
      `La convocatoria ${convocatoriaId} está fuera de su periodo de recepción.`,
      409
    );
  }

  if (!convocatoria.admiteModalidad(tipo)) {
    throw errorDeNegocio(
      `La convocatoria ${convocatoriaId} no admite becas de tipo "${tipo}". Admite: ${convocatoria.modalidades.join(', ')}.`,
      400
    );
  }
}
