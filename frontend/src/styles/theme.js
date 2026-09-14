// src/styles/theme.js
export const theme = {
  colors: {
    // Identidad Institucional MINEDUC / Gobierno de Guatemala
    primary: '#004b87',        // Azul Oficial MINEDUC
    primaryHover: '#003663',   // Azul Oscuro Interactivo
    secondary: '#002b49',      // Navy Profundo (Textos principales/Headers)
    accent: '#0083ca',         // Azul de Acento / Enlaces
    
    // Estados y Alertas
    success: '#15803d',
    successBg: '#f0fdf4',
    successBorder: '#bbf7d0',
    
    error: '#b91c1c',
    errorBg: '#fef2f2',
    errorBorder: '#fecaca',
    
    warning: '#b45309',
    warningBg: '#fffbeb',

    // Neutros
    background: '#f1f5f9',     // Gris Azulado Claro (Fondo general)
    cardBg: '#ffffff',         // Blanco Puro para tarjetas
    textPrimary: '#0f172a',    // Texto Principal
    textSecondary: '#475569',  // Texto Secundario / Hints
    border: '#cbd5e1',         // Bordes de Inputs
    borderFocus: '#004b87'     // Borde activo
  },
  
  fonts: {
    main: "'Segoe UI', system-ui, -apple-system, sans-serif"
  },
  
  shadows: {
    card: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
    inputFocus: '0 0 0 3px rgba(0, 75, 135, 0.15)'
  },
  
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px'
  }
};