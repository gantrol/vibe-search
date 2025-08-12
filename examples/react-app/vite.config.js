import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Make environment variables available in the browser
    'process.env': process.env
  },
  server: {
    port: 3000,
    open: true
  }
})