import { SolicitudBeca } from './SolicitudBeca.js';

/**
 * Patrón Factory Method — Producto concreto: beca de posgrado.
 *
 * Pide los mismos tres documentos que la universitaria, pero el título debe ser
 * de licenciatura. La diferencia no está en la lista de documentos sino en una
 * regla sobre uno de ellos, y encapsularla aquí evita que el validador del
 * expediente tenga que saber de modalidades.
 */
export class SolicitudPosgrado extends SolicitudBeca {
  get tipo() {
    return 'posgrado';
  }

  get documentosRequeridos() {
    return ['dni', 'titulo', 'carta'];
  }

  get nivelTituloRequerido() {
    return 'licenciatura';
  }
}
