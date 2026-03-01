import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',   // ← CHANGED from 5000 to 3002 (Order Gateway)
        changeOrigin: true,
        // Removes /api prefix: /api/meals → /meals on the gateway
        rewrite: path => path.replace(/^\/api/, ''),
      },
      '/socket.io': {
        target: 'http://localhost:3005',   // ← CHANGED from 5000 to 3005 (Notification Hub)
        changeOrigin: true,
        ws: true,   // required for WebSocket connections
      },
    },
  },
})