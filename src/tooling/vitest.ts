import { mergeConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

// Preserve the peer's ESM type identity in both declaration formats.
type UserConfig = import("vitest/config", { with: { "resolution-mode": "import" } }).UserConfig

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
