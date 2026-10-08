import { INotificacionObserver } from './INotificacionObserver.js';

/**
 * Patrón Observer — Suscriptor concreto que notifica por correo electrónico.
 *
 * PROBLEMA QUE RESUELVE:
 * Es la pieza que traduce el evento de dominio ("la solicitud cambió de estado")
 * al canal concreto (correo al estudiante). Al vivir fuera de la máquina de
 * estados, el envío de correo puede cambiar de proveedor, fallar o desactivarse
 * sin que el ciclo de vida de la solicitud se entere.
 *
 * NOTA DE IMPLEMENTACIÓN:
 * El envío real todavía no está integrado (queda para el ticket de integración
 * SMTP). Por ahora el transporte por defecto escribe en consola, pero la
 * mecánica del patrón está completa: el transporte se inyecta por constructor,
 * así que conectar Nodemailer más adelante es cambiar un argumento, no esta
 * clase. Inyectarlo también permite probar el observer sin espiar `console`.
 */
export class EmailNotificationListener extends INotificacionObserver {
  /**
   * @param {string} destinatario Correo del estudiante a notificar.
   * @param {object} [opciones]
   * @param {(correo: {para: string, asunto: string, cuerpo: string}) => void} [opciones.transporte]
   *   Función que efectúa el envío. Por defecto loguea en consola.
   */
  constructor(destinatario, { transporte } = {}) {
    super();

    if (!destinatario || typeof destinatario !== 'string') {
      throw new TypeError('EmailNotificationListener requiere un correo de destinatario.');
    }

    this.destinatario = destinatario;
    this.transporte = transporte ?? EmailNotificationListener.transporteConsola;
    /** @type {Array<{para: string, asunto: string, cuerpo: string}>} Bitácora en memoria de lo enviado. */
    this.enviados = [];
  }

  /**
   * Transporte por defecto: deja constancia en el log del servidor.
   * @param {{para: string, asunto: string, cuerpo: string}} correo
   */
  static transporteConsola({ para, asunto, cuerpo }) {
    console.log(`[correo] para=${para} asunto="${asunto}" :: ${cuerpo}`);
  }

  /**
   * Reacciona al cambio de estado enviando (o simulando) el correo.
   * @param {string} mensaje
   * @param {{solicitudId?: number|string, estadoAnterior?: string, estadoNuevo?: string}} [contexto]
   */
  actualizar(mensaje, contexto = {}) {
    const correo = {
      para: this.destinatario,
      asunto: contexto.solicitudId
        ? `Actualización de su solicitud de beca #${contexto.solicitudId}`
        : 'Actualización de su solicitud de beca',
      cuerpo: mensaje,
    };

    this.enviados.push(correo);
    this.transporte(correo);
  }
}
