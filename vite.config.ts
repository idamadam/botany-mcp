import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "node:path";

export default defineConfig({
  root: "ui",
  plugins: [viteSingleFile()],
  build: {
    outDir: "../dist/app",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve("ui/plant-learning-card.html")
    }
  }
});
