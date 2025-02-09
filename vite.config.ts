import { defineConfig } from "vite"

export default defineConfig({
  build: {
    target: "node16",
    lib: {
      entry: "src/index.ts", // Entry point for your package
      formats: ["es", "cjs"], // Build both ESM and CommonJS
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: [
        "express",
        "lodash",
        "@sequelize/core", // Keep external dependencies out of the bundle
      ],
    },
  },
  resolve: {
    alias: {
      "@": "/src", // Use @ for cleaner imports
    },
  },
})
