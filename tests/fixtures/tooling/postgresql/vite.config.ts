import { resolve } from "node:path"
import { defineConfig } from "vitest/config"
import { createVitestConfig } from "express-light-rail/tooling/vitest"

export default defineConfig(
  createVitestConfig({
    resolve: {
      alias: {
        "@": resolve(import.meta.dirname, "src"),
        "@tests": resolve(import.meta.dirname, "tests"),
      },
    },
    test: {
      root: ".",
      globalSetup: "./tests/global-setup.ts",
      setupFiles: ["./tests/setup.ts"],
      clearMocks: false,
      fileParallelism: true,
    },
  })
)
