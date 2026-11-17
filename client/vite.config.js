import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Read .env from the repo root (next to package.json) instead of client/
  envDir: '..',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Forward API calls to the Node server during development
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
