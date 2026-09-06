import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "https://rivalio-app.onrender.com",
        changeOrigin: true,
      },
      "/uploads": {
        target: "https://rivalio-app.onrender.com",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "https://rivalio-app.onrender.com",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
