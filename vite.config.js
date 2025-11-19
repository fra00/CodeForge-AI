import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@/": path.resolve(__dirname, "./src"),
      "@hooks/": path.resolve(__dirname, "./src/hooks"),
      "@types/": path.resolve(__dirname, "./src/types"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    css: true,
    // Rimosso l'ambiente 'jsdom' per testare la logica pura ed evitare l'errore ERR_REQUIRE_ESM
    transformMode: {
      web: [/\.jsx$/, /\.js$/],
    },
  },
});
