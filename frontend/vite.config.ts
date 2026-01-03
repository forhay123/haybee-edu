/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],

  define: {
    global: 'globalThis',
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api/v1": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
    },
  },
});