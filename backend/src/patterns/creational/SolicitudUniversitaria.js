import { SolicitudBeca } from './SolicitudBeca.js';

/**
 * Patrón Factory Method — Producto concreto: beca universitaria.
 *
 * Exige acreditar el diversificado terminado, por lo que suma el título a los
 * requisitos de nivel medio.
 */
export class SolicitudUniversitaria extends SolicitudBeca {
  get tipo() {
    return 'universitaria';
  }

  get documentosRequeridos() {
    return ['dni', 'titulo', 'carta'];
  }

  get nivelTituloRequerido() {
    return 'diversificado';
  }
}
