// Vite dev server, production build, and Vitest configuration.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

const analyzeBundle = process.env.ANALYZE === 'true'

/** Split React and Tone into parallel eager vendor chunks (Tone stays off splash tap). */
function vendorManualChunks(id: string): string | undefined {
  if (id.includes('node_modules/react-dom')) {
    return 'react-vendor'
  }
  if (id.includes('node_modules/react/')) {
    return 'react-vendor'
  }
  if (id.includes('node_modules/tone')) {
    return 'tone-vendor'
  }
  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    analyzeBundle &&
      visualizer({
        filename: 'dist/bundle-stats.html',
        gzipSize: true,
        open: false,
      }),
  ].filter(Boolean),
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks: vendorManualChunks,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
