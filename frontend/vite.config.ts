import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Em dev, a API NestJS local responde em 3001
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
