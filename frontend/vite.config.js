import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The dev server proxies API and Sanctum requests to Laravel, so the browser
// sees one origin (localhost:5173). Session cookies and the XSRF-TOKEN cookie
// then work without CORS configuration.
const API_TARGET = 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: API_TARGET },
      '/sanctum': { target: API_TARGET },
    },
  },
})
