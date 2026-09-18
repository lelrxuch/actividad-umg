import { EstadoBorrador } from './EstadoBorrador.js';
import { EstadoEnviada } from './EstadoEnviada.js';
import { EstadoEnEvaluacion } from './EstadoEnEvaluacion.js';
import { EstadoAprobada } from './EstadoAprobada.js';
import { EstadoRechazada } from './EstadoRechazada.js';

export { IEstadoSolicitud } from './IEstadoSolicitud.js';
export { TransicionInvalidaError } from './TransicionInvalidaError.js';
export { Solicitud } from './Solicitud.js';
export { EstadoBorrador, EstadoEnviada, EstadoEnEvaluacion, EstadoAprobada, EstadoRechazada };

/**
 * Mapa nombre persistido → clase de estado.
 *
 * En base de datos el estado se guarda como texto ("Borrador", "Enviada", ...).
 * Este mapa es el único punto del sistema que traduce ese texto de vuelta a un
 * objeto del patrón State, para que el resto del código nunca compare strings.
 * @type {Record<string, new () => import('./IEstadoSolicitud.js').IEstadoSolicitud>}
 */
const ESTADOS_POR_NOMBRE = {
  [new EstadoBorrador().nombre]: EstadoBorrador,
  [new EstadoEnviada().nombre]: EstadoEnviada,
  [new EstadoEnEvaluacion().nombre]: EstadoEnEvaluacion,
  [new EstadoAprobada().nombre]: EstadoAprobada,
  [new EstadoRechazada().nombre]: EstadoRechazada,
};

/** @returns {string[]} Nombres válidos de estado, útil para validar entradas. */
export function nombresDeEstado() {
  return Object.keys(ESTADOS_POR_NOMBRE);
}

/**
 * Reconstruye el objeto estado a partir del nombre guardado en base de datos.
 * @param {string} nombre
 * @returns {import('./IEstadoSolicitud.js').IEstadoSolicitud}
 * @throws {Error} Si el nombre no corresponde a ningún estado conocido.
 */
export function crearEstadoDesdeNombre(nombre) {
  const Estado = ESTADOS_POR_NOMBRE[nombre];

  if (!Estado) {
    throw new Error(
      `Estado desconocido: "${nombre}". Estados válidos: ${nombresDeEstado().join(', ')}.`
    );
  }

  return new Estado();
}
