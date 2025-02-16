/**
 * See https://vitest.dev/config/#setupfiles
 *
 * Run some code before each test file.
 *
 * WARNING: Be very careful of imports in this file!!!
 * Vitest will not mock modules that were imported inside a setup file because they are
 * cached by the time a test file is running.
 * You can do
 * ```ts
 * vi.hoisted(() => {
 *   vi.resetModules()
 * })
 * ```
 * to clear all module caches before running a test file.
 * See: https://vitest.dev/api/vi#vi-mock
 */


// import * as matchers from "@/support/matchers"

// // Add New Matchers
// expect.extend(matchers)

beforeEach(async () => {
  // Do something like clean a database
})
