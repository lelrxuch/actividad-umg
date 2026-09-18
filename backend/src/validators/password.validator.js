/**
 * Regla única de fuerza de contraseña para toda la plataforma.
 *
 * POR QUÉ ESTE MÓDULO EXISTE:
 * La misma regla estaba escrita a mano en varios lugares (registro, formulario
 * de registro del frontend y una versión recortada en el controller de
 * recuperación, que solo comprobaba la longitud). Tener copias divergentes
 * significa que un usuario puede registrarse con una política y restablecer su
 * contraseña con otra más débil, que es justamente el hueco que reportó
 * SCRUM-29.
 *
 * Cualquier cambio futuro de la política (subir a 12 caracteres, exigir un
 * símbolo) debe hacerse aquí y en ningún otro lugar del backend.
 *
 * Criterio de aceptación (SCRUM-15 / SCRUM-19): mínimo 8 caracteres, al menos
 * una mayúscula y al menos un número.
 */

/** @type {RegExp} Expresión que define la política. */
export const REGEX_CONTRASENA = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

/** @type {string} Mensaje único, para que el usuario vea siempre el mismo texto. */
export const MENSAJE_CONTRASENA_INVALIDA =
  'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.';

/**
 * Indica si una contraseña cumple la política, sin lanzar excepciones.
 * Útil cuando se quiere acumular varios errores de validación antes de responder.
 *
 * @param {string} contrasena Contraseña en texto plano a evaluar.
 * @returns {boolean} `true` si cumple la política.
 */
export function esContrasenaValida(contrasena) {
  return typeof contrasena === 'string' && REGEX_CONTRASENA.test(contrasena);
}

/**
 * Valida la contraseña y lanza un error de negocio si no cumple la política.
 *
 * El error lleva `status = 400` para que el controller (o el futuro middleware
 * de errores centralizado) lo traduzca a una respuesta HTTP adecuada en vez de
 * un 500 genérico.
 *
 * @param {string} contrasena Contraseña en texto plano a validar.
 * @throws {Error & { status: number }} Si la contraseña no cumple la política.
 * @returns {void}
 */
export function validarContrasena(contrasena) {
  if (!esContrasenaValida(contrasena)) {
    const error = new Error(MENSAJE_CONTRASENA_INVALIDA);
    error.status = 400;
    throw error;
  }
}
