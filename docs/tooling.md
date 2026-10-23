# Optional consumer tooling

This package exposes opt-in configuration building blocks. They are not imported by the runtime entrypoint and do not start an application, select a database, or install a host wrapper.

## Entry points

- `express-light-rail/tooling/eslint` exports `createEslintConfig(...flatConfigOverrides)`, a flat ESLint baseline for TypeScript, recommended JavaScript/TypeScript rules, Prettier conflict suppression, and underscore-prefixed unused bindings. Pass ordinary flat-config objects to extend or override it.
- `express-light-rail/tooling/prettier` exports `prettierConfig`, the shared formatting object. Consumers add their own plugins and options. Keep SQL formatting plugins and dialect settings in the host config.
- `express-light-rail/tooling/vitest` exports `createVitestConfig(overrides)`. It composes the shared Vitest mock reset/restore defaults and `vite-tsconfig-paths` for `tsconfig.json` and `tests/tsconfig.json` with native Vite `mergeConfig`. Supply host aliases, `root`, global/setup hooks, coverage, environment, mock policy, and concurrency through normal Vite/Vitest options. The preset deliberately sets no database lifecycle and no worker/fork policy.

These configuration entrypoints are optional tooling peers; they are not runtime dependencies and are not activated by importing `express-light-rail`. Configure the application explicitly. Flat ESLint config requires ESLint 9; this package does not adapt legacy `.eslintrc` files or upgrade them.

## Supported tooling ranges

The maintained integration baseline is:

| Tool | Supported range |
| --- | --- |
| Node.js for optional tooling | `>=22.13` |
| ESLint | `>=9 <10` (flat config) |
| `@eslint/js` | `>=9 <10` |
| `typescript-eslint` | `>=8.24 <9` |
| `eslint-config-prettier` | `>=10 <11` |
| Prettier | `>=3 <4` |
| TypeScript | `>=5.7 <6` |
| Vite | `>=5 <6` |
| Vitest | `>=2.1 <3` |
| `vite-tsconfig-paths` | `>=5 <6` |

These are configuration compatibility ranges, not a claim about a host's resolved package versions or installed artifact. Database/SQL plugins are host-selected and outside these ranges. Keep the framework, ORM, SQL dialect, and resolved versions owned by the application.

The package's ordinary runtime still declares Node `>=22`; this optional tooling baseline is exercised on Node 22.13 and 24.15. CommonJS tooling loads ESM-only peers through Node's native ESM interop, so older Node 22 releases are outside this tooling baseline. Keep existing host tooling until its runtime prerequisites are met rather than forcing an application upgrade. The fixtures run actual tests through both ESM and CommonJS configurations; Vite 5's upstream CommonJS API deprecation notice remains visible.

## Native composition and adoption

A host can add the configuration entrypoints to its own standard files and use existing config features:

```js
// eslint.config.mjs
import { createEslintConfig } from "express-light-rail/tooling/eslint"

export default createEslintConfig({ files: ["src/**/*.ts"] })
```

```ts
import { defineConfig } from "vitest/config"
import { createVitestConfig } from "express-light-rail/tooling/vitest"

export default defineConfig(
  createVitestConfig({
    test: {
      root: ".",
      globalSetup: "./tests/global-setup.ts",
      setupFiles: ["./tests/setup.ts"],
      poolOptions: { forks: { singleFork: true } },
    },
  })
)
```

The Vitest example's worker choice is illustrative only: preserve the host's existing isolation and concurrency policy rather than copying it. Use normal Vite/Vitest overrides to retain host-specific plugin arrays, aliases, lifecycle hooks, environment, and mock options. Host global setup owns migrations, seed data, and database cleanup.

Prettier's export is an object, not a SQL plugin. A PostgreSQL application can add its PostgreSQL-aware SQL plugin/options; a T-SQL application can select its own SQL plugin and T-SQL dialect. Verify formatted SQL still expresses the intended host dialect before removing existing formatting settings.
The consumer smoke fixtures pin `prettier-plugin-sql` to the `^0.19.2` range and exercise its `postgresql` and `tsql` language modes. This is fixture coverage, not a dependency imposed on consumers.

First compare effective settings and run the consumer's checks with host hooks and aliases intact. Then delete only duplicated settings actually supplied by the preset. Keep any host-specific rule, plugin, alias, SQL dialect, hook, mock behavior, or isolation choice not supplied here. The two packed consumer smoke fixtures in `tests/fixtures/tooling/` exercise TypeScript lint failure, TypeScript and dialect-specific SQL formatting, source/test aliases, lifecycle hooks, and native overrides.

Run `bash tests/fixtures/tooling/postgresql/scripts/smoke.sh` and the matching `tsql` script from the checkout. With no argument each script builds and packs local source; pass `/absolute/path/to/express-light-rail-<version>.tgz` as its first argument to install an exact already-fetched release instead. Each fixture records the installed version. A local pack does not prove registry publication.

## Ownership boundaries

The package owns reusable config values only. Consumer applications continue to own `bin/dev` or other development wrappers, Docker/Compose services, service names, gateway and DevHelper behavior, credentials, cloud helpers, host-specific database setup, and deployment configuration. Reuse those owners' documented commands; do not copy them into this package or these presets.

For shared authoring and review doctrine, see [MSSRT issue #725](https://github.com/klondikemarlen/marlens-skills-rules-and-tools/issues/725). This executable preset is not a substitute for that doctrine and does not require its full plugin.
