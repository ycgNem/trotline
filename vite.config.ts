import { defineConfig } from 'vite';

// Port 5180 so Trotline's dev server never collides with Sprocket & Sprout's or Last Watt's (5173).
export default defineConfig({
  base: './',
  server: { port: 5180, host: '127.0.0.1' },
  preview: { port: 4180, host: '127.0.0.1' },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
} as any);
