import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// BMI UMS - 100% Open Source Frontend
// Backend API: http://localhost:3001

export default defineConfig({
  preview: {
    port: 5174,
    host: "0.0.0.0",
    // Allow any host — needed when Ngrok Tunnel or a reverse proxy forwards
    // requests from a public domain.  Safe because the preview server only
    // serves pre-built static files (no source code exposure).
    allowedHosts: true,
  },
  server: {
    port: 5174,
    host: "0.0.0.0",
    // Allow any host — needed when Ngrok Tunnel or a reverse proxy forwards
    // requests from a public domain.
    allowedHosts: true,
    // historyApiFallback is handled by Vite's SPA fallback natively
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Only include the lightweight SVG — the large PNG seal stays uncached
      includeAssets: ["BMI.svg"],
      manifest: {
        name: "BMI University Management System",
        short_name: "BMI UMS",
        description:
          "BMI University — Integrated Management System for Students, Staff, Finance and Academic Records.",
        theme_color: "#4B0082",
        background_color: "#1a0033",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            // SVG icon works across all modern browsers and Android
            src: "/BMI.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        // Cache JS, CSS, HTML and fonts — exclude large image assets
        globPatterns: ["**/*.{js,css,html,ico,woff2}"],
        // Don't pre-cache files above 3 MiB (handles any stray large chunk)
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Don't cache backend API requests
        navigateFallbackDenylist: [/^\/api\//, /^\/health/],
        runtimeCaching: [
          {
            // Cache API GET reads for 5 minutes — offline shows stale data
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/api/v1/") &&
              url.pathname !== "/api/v1/auth/login" &&
              url.pathname !== "/api/v1/auth/logout",
            handler: "NetworkFirst",
            options: {
              cacheName: "bmi-api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 5 * 60,
              },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@shared": path.resolve(__dirname, "./shared/types"),
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("html2pdf.js")) return "vendor-html2pdf";
          if (id.includes("exceljs")) return "vendor-exceljs";
          if (id.includes("recharts")) return "vendor-charts";
          if (id.includes("file-saver")) return "vendor-files";
          if (id.includes("qrcode") || id.includes("jsqr")) return "vendor-qr";
          if (id.includes("lucide-react")) return "vendor-icons";

          return undefined;
        },
      },
    },
  },
});
