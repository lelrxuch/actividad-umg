// src/utils/auditoria.js
// Cómo se muestra cada registro de auditoría. Separado de la página para que
// se pueda probar solo y para que la página exporte únicamente componentes.
import { nombreDocumento } from './catalogos';

export const OPERACION = {
  cambio_estado: 'Cambio de estado',
  aprobacion: 'Aprobación',
  cambio_monto: 'Cambio de monto',
  asignacion_evaluador: 'Asignación de evaluador',
  subida_documento: 'Subida de documento',
  validacion_identidad: 'Validación de identidad',
};

const ETAPA = { evaluacion: 'Evaluación', autorizacion: 'Autorización' };

const quetzales = (valor) =>
  valor === null || valor === undefined
    ? 'sin monto'
    : `Q${Number(valor).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Qué cambió, en una línea legible. */
export function describirDetalle(operacion, detalle = {}) {
  switch (operacion) {
    case 'cambio_estado':
      return `${detalle.antes} → ${detalle.despues}`;
    case 'aprobacion':
      return `${ETAPA[detalle.etapa] ?? detalle.etapa}: ${detalle.resultado}`;
    case 'cambio_monto':
      return `${quetzales(detalle.antes)} → ${quetzales(detalle.despues)}`;
    case 'asignacion_evaluador':
      return `${detalle.evaluadorNombre} (#${detalle.evaluadorId})`;
    case 'subida_documento':
      return `${nombreDocumento(detalle.tipo)} (${detalle.nombreArchivo})`;
    case 'validacion_identidad':
      return `CUI ${detalle.cui}: ${detalle.resultado}`;
    default:
      return JSON.stringify(detalle);
  }
}
