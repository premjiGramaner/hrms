import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: true,
    //  proxy: {
    //   '/api': {
    //     target: 'http://localhost:5001',
    //     changeOrigin: true,
    //   },
    //   '/uploads': {
    //     target: 'http://localhost:5001',
    //     changeOrigin: true,
    //   },
    // }
    proxy: {
      '/api': {
        target: 'https://f79f-2402-3a80-1821-96ab-ad27-3ae2-7962-7bec.ngrok-free.app',
        changeOrigin: true,
        headers: {
      'ngrok-skip-browser-warning': 'true',
    },
      },
      '/uploads': {
        target: 'https://f79f-2402-3a80-1821-96ab-ad27-3ae2-7962-7bec.ngrok-free.app',
        changeOrigin: true,
      },
    },
  },
});
