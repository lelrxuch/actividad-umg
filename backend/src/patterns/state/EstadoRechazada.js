import { IEstadoSolicitud } from './IEstadoSolicitud.js';

/**
 * Patrón State — Estado concreto "Rechazada" (final).
 *
 * La solicitud no cumplió los requisitos. Igual que {@link EstadoAprobada}, es
 * un estado terminal y bloquea toda acción posterior. Si el negocio llegara a
 * permitir apelaciones, se resolvería agregando una clase EstadoEnApelacion y
 * un método `apelar()` aquí, sin tocar ningún otro estado.
 */
export class EstadoRechazada extends IEstadoSolicitud {
  get nombre() {
    return 'Rechazada';
  }

  get esFinal() {
    return true;
  }
}
