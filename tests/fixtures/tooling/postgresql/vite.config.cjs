const { resolve } = require("node:path")
const { createVitestConfig } = require("express-light-rail/tooling/vitest")

module.exports = createVitestConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@tests": resolve(__dirname, "tests"),
    },
  },
  test: {
    globalSetup: "./tests/global-setup.ts",
    setupFiles: ["./tests/setup.ts"],
    globals: false,
  },
})
