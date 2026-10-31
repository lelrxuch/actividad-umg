import { IEstadoSolicitud } from './IEstadoSolicitud.js';
import { EstadoAprobada } from './EstadoAprobada.js';
import { EstadoRechazada } from './EstadoRechazada.js';

/**
 * Estado concreto: la solicitud de mayor monto ya tiene la aprobación del
 * evaluador y espera la de la autoridad autorizadora.
 *
 * Existe para que "no podrá marcarse como autorizada mientras falte alguna de
 * las aprobaciones" lo garantice el patrón State y no un `if`: desde En
 * Evaluación, una solicitud que requiere dos aprobaciones solo puede llegar
 * aquí, y desde aquí la única acción posible es la autorización final.
 *
 * Un rechazo termina en Rechazada, que es final: la solicitud no continúa.
 */
export class EstadoPendienteAutorizacion extends IEstadoSolicitud {
  get nombre() {
    return 'Pendiente de Autorización';
  }

  get accionesPermitidas() {
    return ['autorizar'];
  }

  autorizar(solicitud, aprobado) {
    if (typeof aprobado !== 'boolean') {
      throw new TypeError('La autorización requiere un valor booleano: true aprueba, false rechaza.');
    }

    solicitud.cambiarEstado(aprobado ? new EstadoAprobada() : new EstadoRechazada());
  }
}
