import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.GOOGLE_APPLICATION_CREDENTIALS': JSON.stringify('./config/credentials.json'),
    'process': JSON.stringify({
      stdout: { isTTY: false },
      stderr: { isTTY: false }
    }),
  },
});