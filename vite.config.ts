import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

const enableLegacyServerProxy = process.env.VITE_ENABLE_LEGACY_SERVER_PROXY === "true";
const legacyServerProxy = enableLegacyServerProxy
  ? {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://127.0.0.1:3001",
        ws: true,
      },
    }
  : undefined;

function manualChunks(id: string) {
  if (!id.includes("node_modules")) {
    return undefined;
  }

  if (id.includes("node_modules/phaser")) {
    return "phaser";
  }

  return undefined;
}

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: legacyServerProxy,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
}));
