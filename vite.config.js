import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/clientes': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/proveedores': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/articulos': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/facturas': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/facturas-items': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/fichadas': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/usuarios': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/anviz': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
