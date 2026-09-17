/**
 * Patrón Observer — Interfaz (clase base abstracta) de los suscriptores a
 * cambios de estado de una Solicitud.
 *
 * PROBLEMA QUE RESUELVE:
 * Cada cambio de estado de una solicitud debe avisarle al estudiante. La
 * solución ingenua es llamar a `enviarCorreo(...)` dentro de la máquina de
 * estados, pero eso acopla el ciclo de vida de la solicitud al canal de
 * notificación: agregar SMS, una bitácora de auditoría o un webhook obligaría a
 * modificar los estados una y otra vez.
 *
 * El patrón Observer invierte esa dependencia. La Solicitud (el "sujeto") solo
 * sabe que tiene suscriptores y les anuncia "cambié de estado"; cada suscriptor
 * decide qué hacer con el aviso. Agregar un canal nuevo es crear una clase que
 * extienda esta interfaz y registrarla, sin tocar el dominio.
 *
 * @abstract
 */
export class INotificacionObserver {
  /**
   * Recibe el aviso de un cambio de estado.
   * @param {string} mensaje Texto ya redactado por el sujeto.
   * @param {object} [contexto] Datos crudos del evento, por si el observer
   *   necesita algo más que el texto (id de solicitud, estados, fecha).
   * @abstract
   */
  actualizar(mensaje, contexto) {
    throw new Error(`${this.constructor.name} debe implementar el método "actualizar(mensaje)".`);
  }
}
