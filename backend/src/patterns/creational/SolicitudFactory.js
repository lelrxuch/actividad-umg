import { SolicitudNivelMedio } from './SolicitudNivelMedio.js';
import { SolicitudUniversitaria } from './SolicitudUniversitaria.js';
import { SolicitudPosgrado } from './SolicitudPosgrado.js';

/**
 * Patrón Factory Method — Creador.
 *
 * PROBLEMA QUE RESUELVE:
 * Es el único punto del sistema que conoce las clases concretas de beca. El
 * código cliente (services, controllers) recibe del usuario un `tipo` en texto
 * y le pide a esta fábrica el producto correspondiente, sin importar nada de
 * `SolicitudNivelMedio` ni de sus hermanas. Agregar una modalidad nueva —una
 * beca técnica, por ejemplo— es crear la clase y registrarla en el mapa de
 * abajo: ni un solo archivo cliente cambia.
 *
 * El mapa se construye desde el propio getter `tipo` de cada clase, así que la
 * clave y el nombre del tipo no pueden desincronizarse.
 */

/** @type {Record<string, new () => import('./SolicitudBeca.js').SolicitudBeca>} */
const MODALIDADES = Object.fromEntries(
  [SolicitudNivelMedio, SolicitudUniversitaria, SolicitudPosgrado].map((Clase) => [
    new Clase().tipo,
    Clase,
  ])
);

export class SolicitudFactory {
  /**
   * Factory Method: devuelve la solicitud correspondiente a la modalidad pedida.
   *
   * @param {string} tipo Modalidad de beca ('nivel-medio', 'universitaria', 'posgrado').
   * @returns {import('./SolicitudBeca.js').SolicitudBeca} Producto concreto, visto
   *   por el cliente únicamente a través de la interfaz abstracta.
   * @throws {Error & { status: number }} Si la modalidad no existe.
   */
  static crearSolicitud(tipo) {
    const Modalidad = MODALIDADES[tipo];

    if (!Modalidad) {
      const error = new Error(
        `Tipo de beca desconocido: "${tipo}". Tipos válidos: ${SolicitudFactory.tiposDisponibles().join(', ')}.`
      );
      error.status = 400;
      throw error;
    }

    return new Modalidad();
  }

  /**
   * Modalidades registradas. Sirve para validar entradas y para que el frontend
   * arme el selector de tipo de beca sin tener la lista hardcodeada.
   * @returns {string[]}
   */
  static tiposDisponibles() {
    return Object.keys(MODALIDADES);
  }
}
