import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Basic Vitest config for jsdom environment and setup file
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Match Vite tsconfig path alias for '@' -> /src
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/vitest.setup.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      provider: 'v8',
    },
  },
});
