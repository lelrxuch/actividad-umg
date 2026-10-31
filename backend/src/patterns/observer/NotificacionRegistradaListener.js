import { INotificacionObserver } from './INotificacionObserver.js';

/**
 * Patrón Observer — Suscriptor que deja constancia de cada aviso.
 *
 * Responde a tres criterios del requerimiento de notificaciones a la vez:
 *
 * - **Registrar el evento que origina la notificación.** Antes de intentar la
 *   entrega crea la fila en `notificaciones` con la solicitud, el cambio de
 *   estado y el destinatario. Si el canal falla, el evento ya quedó guardado.
 * - **Manejar los errores del servicio de notificaciones.** Si la entrega
 *   falla, la fila queda marcada con el error y la falla se propaga a
 *   `Solicitud#notificar`, que la atrapa y la registra en la consola: el
 *   proceso de solicitudes no se entera.
 * - **Permitir otros canales.** Lo que cambia entre canales es solo `entregar`.
 *   En la aplicación no hay nada que entregar: el aviso guardado ES el aviso,
 *   y la pantalla del estudiante lo lee. Un canal de correo o de SMS pasa su
 *   función de envío, sin tocar esta clase ni el servicio de solicitudes.
 */
export class NotificacionRegistradaListener extends INotificacionObserver {
  /**
   * @param {object} opciones
   * @param {number} opciones.destinatarioId Usuario dueño de la solicitud.
   * @param {string} opciones.canal Nombre del canal, por ejemplo `'app'`.
   * @param {{
   *   registrar: (aviso: object) => Promise<{id: number}>,
   *   marcarResultado: (id: number, resultado: {enviada: boolean, error?: string}) => Promise<unknown>
   * }} opciones.repositorio Dónde se guardan los avisos.
   * @param {(mensaje: string, contexto: object) => (void|Promise<void>)} [opciones.entregar]
   *   Cómo llega el aviso al destinatario. Sin ella, el aviso guardado es la
   *   entrega (canal en la aplicación).
   */
  constructor({ destinatarioId, canal, repositorio, entregar = null }) {
    super();

    if (destinatarioId === undefined || destinatarioId === null) {
      throw new TypeError('NotificacionRegistradaListener requiere el destinatario.');
    }
    if (!canal) {
      throw new TypeError('NotificacionRegistradaListener requiere el nombre del canal.');
    }
    if (!repositorio) {
      throw new TypeError('NotificacionRegistradaListener requiere dónde registrar los avisos.');
    }

    this.destinatarioId = destinatarioId;
    this.canal = canal;
    this.repositorio = repositorio;
    this.entregar = entregar;
  }

  /**
   * @param {string} mensaje
   * @param {{solicitudId: number, estadoAnterior: string, estadoNuevo: string}} contexto
   */
  async actualizar(mensaje, contexto = {}) {
    const aviso = await this.repositorio.registrar({
      solicitudId: contexto.solicitudId,
      destinatarioId: this.destinatarioId,
      estadoAnterior: contexto.estadoAnterior,
      estadoNuevo: contexto.estadoNuevo,
      canal: this.canal,
      mensaje,
      enviada: this.entregar === null,
    });

    if (this.entregar === null) return;

    try {
      await this.entregar(mensaje, contexto);
    } catch (error) {
      await this.repositorio.marcarResultado(aviso.id, { enviada: false, error: error.message });
      throw error;
    }

    await this.repositorio.marcarResultado(aviso.id, { enviada: true });
  }
}
