import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 5180,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VITE_PERPETUAL_GATEWAY_URL || 'http://127.0.0.1:5174',
        changeOrigin: true,
      },
      '/health': {
        target: process.env.VITE_PERPETUAL_GATEWAY_URL || 'http://127.0.0.1:5174',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    sourcemap: false
  }
});
