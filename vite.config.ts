import { defineConfig } from 'vite';

// base relativo: permite publicar em qualquer subpasta (ex.: GitHub Pages).
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
