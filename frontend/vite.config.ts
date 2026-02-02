import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png"
      ],
      manifest: {
        name: "Vibra",
        short_name: "Vibra",
        description: "Your Music Escape",
        categories: ["music", "entertainment"],
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/vibra-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/vibra-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    port: 3000,
    // allowedHosts: ['abler-unperceptively-nicki.ngrok-free.dev'] 
  }
});
