// Lógica de negocio de Expedientes.
//
// Punto de integración del patrón Builder (backend/src/patterns/creational).
// El service traduce los documentos que llegan por API a llamadas encadenadas
// del ExpedienteBuilder y deja que `build()` decida si el expediente está
// completo. La regla de "qué documentos hacen falta" no se escribe aquí: sale
// del tipo de beca que entrega el Factory Method.
import { SolicitudFactory } from '../patterns/creational/SolicitudFactory.js';
import { ExpedienteBuilder } from '../patterns/creational/ExpedienteBuilder.js';

/**
 * Arma y valida el expediente de una solicitud.
 *
 * Los documentos pueden llegar en cualquier orden y de forma parcial: lo que
 * esté ausente simplemente no se adjunta, y `build()` informa qué falta.
 *
 * @param {string} tipo Modalidad de beca.
 * @param {{dni?: string, titulo?: {nivel?: string, institucion?: string},
 *   carta?: {autor?: string, contenido?: string}}} [documentos]
 * @returns {Readonly<object>} Expediente cerrado e inmutable.
 * @throws {Error & { status: number }} 400 si la modalidad no existe o si el
 *   expediente está incompleto (ExpedienteIncompletoError).
 */
export function armarExpediente(tipo, documentos = {}) {
  const tipoBeca = SolicitudFactory.crearSolicitud(tipo);
  const builder = new ExpedienteBuilder(tipoBeca);

  if (documentos.dni) builder.agregarDNI(documentos.dni);
  if (documentos.titulo) builder.agregarTitulo(documentos.titulo);
  if (documentos.carta) builder.agregarCarta(documentos.carta);

  return builder.build();
}

/**
 * Indica si un conjunto de documentos alcanza para la modalidad, sin lanzar.
 * Útil para que el frontend muestre el progreso del expediente mientras el
 * estudiante sube papeles.
 *
 * @param {string} tipo
 * @param {object} [documentos] Ver {@link armarExpediente}.
 * @returns {{completo: boolean, faltantes: string[]}}
 */
export function revisarExpediente(tipo, documentos = {}) {
  try {
    armarExpediente(tipo, documentos);
    return { completo: true, faltantes: [] };
  } catch (error) {
    if (!error.faltantes) throw error;
    return { completo: false, faltantes: error.faltantes };
  }
}
