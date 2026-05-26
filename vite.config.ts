import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Explicitly tell Vite where to start scanning — eliminates the
  // "Could not auto-determine entry point" warning on first run.
  optimizeDeps: {
    entries: ['./src/main.tsx'],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      '@tanstack/react-query',
      'client-zip',
      'papaparse',
      'react-dropzone',
      'date-fns',
    ],
  },
})
