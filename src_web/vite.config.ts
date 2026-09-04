import { defineConfig } from "vite";

export default defineConfig({
  base: "/SimFoundation/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssMinify: "esbuild",
  },
});
