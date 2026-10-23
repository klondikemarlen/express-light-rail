/// <reference types="vitest/config" />

import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"

import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import tsconfigPaths from "vite-tsconfig-paths"

const externalDependencies = [
  "@sequelize/core",
  "express",
  "lodash",
  "winston",
  "@eslint/js",
  "eslint",
  "eslint-config-prettier",
  "typescript-eslint",
  "vitest/config",
  "vite-tsconfig-paths",
]

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "tooling/eslint": resolve(__dirname, "src/tooling/eslint.ts"),
        "tooling/prettier": resolve(__dirname, "src/tooling/prettier.ts"),
        "tooling/vitest": resolve(__dirname, "src/tooling/vitest.ts"),
        "contracts/index": resolve(__dirname, "src/contracts/index.ts"),
      },
      name: "ExpressLightRail",
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "js" : "cjs"}`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: externalDependencies,
      output: {
        interop: "auto",
      },
    },
  },
  plugins: [
    tsconfigPaths({
      root: ".",
      projects: ["./tsconfig.json", "./tests/tsconfig.json"],
    }),
    dts({
      include: ["src/**/*.ts"],
      outDir: ["dist", "dist/commonjs"],
      async afterBuild() {
        await writeFile(resolve(__dirname, "dist/commonjs/package.json"), '{"type":"commonjs"}\n')
      },
    }),
  ],
  test: {
    globals: true,
    root: ".",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/fixtures/**"],
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
