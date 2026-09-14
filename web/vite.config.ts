import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // The frozen contracts live outside web/. Import them as @contracts so there is exactly
      // one definition of Signal/Evidence/Assessment/Decision in the whole repo.
      '@contracts': path.resolve(import.meta.dirname, '../contracts/ts/contracts.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Talk to the API on :8080 without CORS headaches or hardcoded hosts in components.
      '/v1': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
