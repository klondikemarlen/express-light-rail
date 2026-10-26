import { defineConfig } from "vitest/config"

export default defineConfig({
  root: ".",
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/**"],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    fileParallelism: false,
  },
})
