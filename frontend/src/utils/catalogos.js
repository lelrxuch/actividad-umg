// src/utils/catalogos.js
//
// Nombres legibles de los identificadores que manda el backend. Son solo
// etiquetas: QUÉ documentos exige cada modalidad lo decide el backend
// (Factory Method) y llega en `documentosRequeridos`.

export const NOMBRE_MODALIDAD = {
  'nivel-medio': 'Nivel medio',
  universitaria: 'Universitaria',
  posgrado: 'Posgrado',
};

export const NOMBRE_DOCUMENTO = {
  dni: 'Documento Personal de Identificación (DPI)',
  titulo: 'Título del nivel anterior',
  carta: 'Carta de recomendación',
};

export const nombreModalidad = (m) => NOMBRE_MODALIDAD[m] ?? m;
export const nombreDocumento = (d) => NOMBRE_DOCUMENTO[d] ?? d;
