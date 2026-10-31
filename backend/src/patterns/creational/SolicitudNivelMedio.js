import { SolicitudBeca } from './SolicitudBeca.js';

/**
 * Patrón Factory Method — Producto concreto: beca de nivel medio.
 *
 * El estudiante todavía está cursando el diversificado, así que no puede
 * acreditar ningún título. Es la modalidad con menos requisitos y por eso el
 * caso que demuestra que los requisitos son por clase y no una lista global.
 */
export class SolicitudNivelMedio extends SolicitudBeca {
  get tipo() {
    return 'nivel-medio';
  }

  get documentosRequeridos() {
    return ['dni', 'carta'];
  }
}
