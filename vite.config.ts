import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Em desenvolvimento, /api vai para o servidor local (npm run dev:api).
  server: { proxy: { '/api': `http://localhost:${process.env.API_PORT ?? 3001}` } },
})
