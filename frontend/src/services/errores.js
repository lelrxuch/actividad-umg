// src/services/errores.js
//
// Convierte un error de axios en un Error que conserva lo que el backend dijo.
//
// El backend no solo manda un mensaje: en algunos errores agrega datos que el
// cliente necesita para actuar. `faltantes` dice qué documento falta para
// enviar; `solicitudExistente` dice a qué solicitud ir cuando el estudiante ya
// tiene una en esa convocatoria. Si aquí se tirara todo salvo el texto, la
// pantalla tendría que adivinarlos.

/**
 * @param {any} error Error de axios.
 * @param {string} respaldo Mensaje si el backend no mandó ninguno (red caída).
 * @returns {Error & {status?: number, faltantes?: string[], solicitudExistente?: number}}
 */
export function errorDeApi(error, respaldo) {
  const cuerpo = error?.response?.data ?? {};
  const salida = new Error(cuerpo.error || respaldo, { cause: error });

  if (error?.response?.status) salida.status = error.response.status;
  if (Array.isArray(cuerpo.faltantes)) salida.faltantes = cuerpo.faltantes;
  if (cuerpo.solicitudExistente !== undefined) salida.solicitudExistente = cuerpo.solicitudExistente;

  return salida;
}
