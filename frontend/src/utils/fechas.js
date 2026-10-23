// src/utils/fechas.js
//
// Utilidades de fecha para las convocatorias.
//
// POR QUE NO SE USA `new Date(cadena)` A SECAS:
// El backend devuelve las fechas como texto `YYYY-MM-DD` (la consulta hace
// `fecha_cierre::text` a proposito, para que una fecha de calendario no se
// desplace entre zonas horarias). Si aqui se construyera `new Date('2026-11-15')`
// y se comparara contra `new Date()`, el navegador interpretaria la primera como
// medianoche UTC y la segunda en hora local: en Guatemala, UTC-6, eso adelanta
// o atrasa un dia los calculos cerca de la medianoche. Por eso todo se compara
// en el calendario UTC, con ambas fechas tratadas igual.

/** Los nombres de mes en español, para no depender del locale del navegador. */
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Convierte `YYYY-MM-DD` en la medianoche UTC de ese dia.
 *
 * @param {string} texto Fecha en formato `YYYY-MM-DD`.
 * @returns {number|null} Milisegundos UTC, o null si el texto no sirve.
 */
function aDiaUTC(texto) {
  if (typeof texto !== 'string') return null;

  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
  if (!partes) return null;

  const [, anio, mes, dia] = partes;
  const ms = Date.UTC(Number(anio), Number(mes) - 1, Number(dia));
  return Number.isNaN(ms) ? null : ms;
}

/** El dia de hoy, al mismo nivel de precision que `aDiaUTC`. */
function hoyUTC(ahora = new Date()) {
  return Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());
}

/**
 * Dias de calendario entre hoy y la fecha dada.
 *
 * @param {string} fecha Fecha en formato `YYYY-MM-DD`.
 * @param {Date} [ahora] Momento de referencia; se inyecta en las pruebas.
 * @returns {number|null} Positivo si la fecha es futura, 0 si es hoy, negativo
 *   si ya paso. null si la fecha no se pudo interpretar.
 */
export function diasHasta(fecha, ahora = new Date()) {
  const objetivo = aDiaUTC(fecha);
  if (objetivo === null) return null;

  return Math.round((objetivo - hoyUTC(ahora)) / MS_POR_DIA);
}

/**
 * Texto legible de una fecha: `2026-11-15` → `15 de noviembre de 2026`.
 *
 * @param {string} fecha
 * @returns {string} Cadena vacia si la fecha no se pudo interpretar.
 */
export function formatearFecha(fecha) {
  const ms = aDiaUTC(fecha);
  if (ms === null) return '';

  const d = new Date(ms);
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

/**
 * En que punto de su periodo esta una convocatoria.
 *
 * NO decide si se puede aplicar: eso lo dice el campo `recibeSolicitudes` que
 * manda el backend, porque la regla es suya. Esto solo describe el periodo para
 * poder mostrarlo.
 *
 * @param {{fechaApertura: string, fechaCierre: string}} convocatoria
 * @param {Date} [ahora]
 * @returns {{fase: 'por-abrir'|'abierta'|'vencida'|'sin-fechas', dias: number|null, etiqueta: string}}
 */
export function periodo(convocatoria, ahora = new Date()) {
  const { fechaApertura, fechaCierre } = convocatoria || {};
  const haciaApertura = diasHasta(fechaApertura, ahora);
  const haciaCierre = diasHasta(fechaCierre, ahora);

  if (haciaApertura === null && haciaCierre === null) {
    return { fase: 'sin-fechas', dias: null, etiqueta: 'Sin fechas definidas' };
  }

  if (haciaApertura !== null && haciaApertura > 0) {
    return {
      fase: 'por-abrir',
      dias: haciaApertura,
      etiqueta: haciaApertura === 1 ? 'Abre mañana' : `Abre en ${haciaApertura} días`,
    };
  }

  if (haciaCierre !== null && haciaCierre < 0) {
    return { fase: 'vencida', dias: haciaCierre, etiqueta: 'Periodo vencido' };
  }

  if (haciaCierre === null) {
    return { fase: 'abierta', dias: null, etiqueta: 'Abierta, sin fecha de cierre' };
  }

  if (haciaCierre === 0) {
    return { fase: 'abierta', dias: 0, etiqueta: 'Cierra hoy' };
  }

  return {
    fase: 'abierta',
    dias: haciaCierre,
    etiqueta: haciaCierre === 1 ? 'Cierra mañana' : `Cierran en ${haciaCierre} días`,
  };
}
