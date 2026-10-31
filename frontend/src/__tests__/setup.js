// Configuracion comun de las pruebas del frontend.
//
// `@testing-library/jest-dom` agrega las aserciones de DOM (toBeInTheDocument,
// toBeVisible...). `cleanup` desmonta lo renderizado despues de cada prueba,
// para que una no vea el arbol de la anterior.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
