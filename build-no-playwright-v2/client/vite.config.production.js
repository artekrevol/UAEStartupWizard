/**
 * Production-specific Vite configuration
 * This handles path aliases correctly for production builds
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      // Ensure proper external handling
      external: [],
      // Ensure path aliases are preserved in the final build
      preserveEntrySignatures: 'strict',
    },
  },
});