import { EstadoBorradorConvocatoria } from './EstadoBorradorConvocatoria.js';
import { EstadoPublicada } from './EstadoPublicada.js';
import { EstadoCerrada } from './EstadoCerrada.js';

export { IEstadoConvocatoria } from './IEstadoConvocatoria.js';
export { Convocatoria } from './Convocatoria.js';
export { EstadoBorradorConvocatoria, EstadoPublicada, EstadoCerrada };

/**
 * Mapa nombre persistido → clase de estado.
 *
 * Único punto del sistema que traduce el texto de `convocatorias.estado` de
 * vuelta a un objeto del patrón State, para que el resto del código nunca
 * compare cadenas. Se construye desde el propio getter `nombre` de cada clase,
 * así que la clave y el nombre no se pueden desincronizar.
 *
 * @type {Record<string, new () => import('./IEstadoConvocatoria.js').IEstadoConvocatoria>}
 */
const ESTADOS_POR_NOMBRE = Object.fromEntries(
  [EstadoBorradorConvocatoria, EstadoPublicada, EstadoCerrada].map((Clase) => [
    new Clase().nombre,
    Clase,
  ])
);

/** @returns {string[]} Nombres válidos de estado. Coinciden con el CHECK de la tabla. */
export function nombresDeEstado() {
  return Object.keys(ESTADOS_POR_NOMBRE);
}

/**
 * Reconstruye el objeto estado a partir del nombre guardado en base de datos.
 * @param {string} nombre
 * @returns {import('./IEstadoConvocatoria.js').IEstadoConvocatoria}
 * @throws {Error} Si el nombre no corresponde a ningún estado conocido.
 */
export function crearEstadoDesdeNombre(nombre) {
  const Estado = ESTADOS_POR_NOMBRE[nombre];

  if (!Estado) {
    throw new Error(
      `Estado de convocatoria desconocido: "${nombre}". Válidos: ${nombresDeEstado().join(', ')}.`
    );
  }

  return new Estado();
}
