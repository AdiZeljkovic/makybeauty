import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Napomena: `define` za GEMINI_API_KEY je uklonjen. Bio je ostatak scaffoldinga
// i predstavljao je rizik — svaka vrijednost ubačena kroz `define` završava
// doslovno u javnom JS bundleu, dakle vidljiva svakom posjetiocu.

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // Odvojeni chunkovi: biblioteke se rijetko mijenjaju, pa ostaju u kešu
        // posjetioca i kad se kod sajta promijeni.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          const p = id.replace(/\\/g, '/');
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(p)) return 'react';
          if (/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(p)) return 'motion';
          if (/node_modules\/lucide-react\//.test(p)) return 'icons';
          return undefined;
        },
      },
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT || 3001}`,
        changeOrigin: true,
      },
    },
  },
});
