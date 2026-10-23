import { mergeConfig, type UserConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export function createVitestConfig(overrides: UserConfig = {}): UserConfig {
  return mergeConfig(
    {
      plugins: [tsconfigPaths()],
      test: {
        globals: true,
        clearMocks: true,
        mockReset: true,
        restoreMocks: true,
        unstubEnvs: true,
        unstubGlobals: true,
      },
    },
    overrides
  )
}
