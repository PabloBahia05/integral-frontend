import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://https://integral-backend-production.up.railway.app",
        changeOrigin: true,
      },
      "/clientes": {
        target: "http://https://integral-backend-production.up.railway.app",
        changeOrigin: true,
      },
      "/proveedores": {
        target: "http://https://integral-backend-production.up.railway.app",
        changeOrigin: true,
      },
      "/articulos": {
        target: "http://https://integral-backend-production.up.railway.app",
        changeOrigin: true,
      },
      "/facturas": {
        target: "http://https://integral-backend-production.up.railway.app",
        changeOrigin: true,
      },
      "/facturas-items": {
        target: "http://https://integral-backend-production.up.railway.app",
        changeOrigin: true,
      },
      "/fichadas": {
        target: "http://https://integral-backend-production.up.railway.app",
        changeOrigin: true,
      },
      "/usuarios": {
        target: "http://https://integral-backend-production.up.railway.app",
        changeOrigin: true,
      },
      "/anviz": {
        target: "http://https://integral-backend-production.up.railway.app",
        changeOrigin: true,
      },
    },
  },
});
