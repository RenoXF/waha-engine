import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/auth': 'http://localhost:4000',
      '/messages': 'http://localhost:4000',
      '/contacts': 'http://localhost:4000',
      '/groups': 'http://localhost:4000',
      '/files': 'http://localhost:4000',
      '/users': 'http://localhost:4000',
      '/presence': 'http://localhost:4000',
      '/webhook': 'http://localhost:4000',
      '/sse': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
      '/session': 'http://localhost:4000',
    },
  },
});
