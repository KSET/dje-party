import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true,
    allowedHosts: [
      'localhost', 
      '*.fly.dev',
      '*.kset.org',
      '192.168.*.*'
    ]
  },
});