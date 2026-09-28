import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development the Express API runs on :3000 and Vite forwards /api to it.
const proxy = { '/api': 'http://localhost:3000' }

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
})
