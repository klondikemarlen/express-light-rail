/// <reference types="vitest/config" />

import { resolve } from "node:path"

import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import tsconfigPaths from "vite-tsconfig-paths"

const externalDependencies = ["@sequelize/core", "express", "lodash", "winston"]

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "ExpressLightRail",
      fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: externalDependencies,
    },
  },
  plugins: [
    tsconfigPaths({
      root: ".",
      projects: ["./tsconfig.json", "./tests/tsconfig.json"],
    }),
    dts({
      include: ["src/**/*.ts"],
    }),
  ],
  test: {
    globals: true,
    root: ".",
    globalSetup: "./tests/global-setup.ts",
    setupFiles: ["./tests/setup.ts"],
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    forceRerunTriggers: [
      "**/*.(html|txt)", // Rerun tests when data files change
    ],
    // Mocking
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
})
