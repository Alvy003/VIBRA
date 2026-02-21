import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-clerk': ['@clerk/clerk-react'],
          'vendor-router': ['react-router-dom'],
          'vendor-framer': ['framer-motion'],
          'vendor-lucide': ['lucide-react'],
          'vendor-zustand': ['zustand'],
          'vendor-radix': [
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-slot',
          ],
        }
      }
    }
  },
  server: {
    port: 3000,
    allowedHosts: ['abler-unperceptively-nicki.ngrok-free.dev'], 
    proxy: {
      "/api/stream/proxy": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  }
});
