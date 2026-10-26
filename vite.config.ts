import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: "web-dist",
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
