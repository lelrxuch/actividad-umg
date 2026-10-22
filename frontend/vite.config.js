import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Las pruebas de componentes necesitan DOM. Las puras (utils, services) no
    // lo usan, pero correr todo en el mismo entorno evita dos configuraciones.
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.js',
  },
})
