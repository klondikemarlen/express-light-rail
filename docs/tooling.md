# Optional consumer tooling

This package exposes opt-in configuration building blocks. They are not imported by the runtime entrypoint and do not start an application, select a database, or install a host wrapper.

## Entry points

- `express-light-rail/tooling/eslint` exports `createEslintConfig(...flatConfigOverrides)`, a flat ESLint baseline for TypeScript, recommended JavaScript/TypeScript rules, Prettier conflict suppression, and underscore-prefixed unused bindings. Pass ordinary flat-config objects to extend or override it.
- `express-light-rail/tooling/prettier` exports `prettierConfig`, the shared formatting object. Consumers add their own plugins and options. Keep SQL formatting plugins and dialect settings in the host config.
- `express-light-rail/tooling/vitest` exports `createVitestConfig(overrides)`. It composes shared Vitest mock reset/restore defaults and native `vite-tsconfig-paths` discovery with Vite `mergeConfig`; a separate tests tsconfig is not required. Supply host aliases, `root`, global/setup hooks, coverage, environment, mock policy, and concurrency through normal Vite/Vitest options. The preset deliberately sets no database lifecycle and no worker/fork policy.

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

export default createEslintConfig({ ignores: ["dist/**"] })
```

This ignore-only object excludes generated output globally. A `files` selector on an appended override applies only to that override, not to the preceding shared baseline.

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

## TypeScript script runner upgrade

The repository provides `bin/dev tsx` for one-off TypeScript execution. Unlike the old CommonJS `ts-node -r tsconfig-paths/register` command, `tsx` also handles this repository's native ESM and path aliases. The example still compiles with TypeScript before Node starts the server; in the discussion-board example its watcher also rebuilds the package consumed by the application. Replacing that watcher with `tsx watch` alone would leave package changes unbuilt.

### WRAP and Travel Authorization

These are upgrade instructions, not completed host migrations. The reviewed `api/package.json` files use `ts-node` for scripts, initializers, and Knex, and `ts-node-dev` for servers. WRAP additionally starts `src/jobs-server.ts`; Travel Authorization starts `src/scheduler.ts`. Their builds already use `tsc && tsc-alias`.

Source baseline: Travel Authorization at [`8c236048`](https://github.com/icefoganalytics/travel-authorization/tree/8c2360484ae0766fe9f51c8c2d217f130fb721ab), specifically [`api/package.json`](https://github.com/icefoganalytics/travel-authorization/blob/8c2360484ae0766fe9f51c8c2d217f130fb721ab/api/package.json), [`api/tsconfig.json`](https://github.com/icefoganalytics/travel-authorization/blob/8c2360484ae0766fe9f51c8c2d217f130fb721ab/api/tsconfig.json), and [`bin/dev`](https://github.com/icefoganalytics/travel-authorization/blob/8c2360484ae0766fe9f51c8c2d217f130fb721ab/bin/dev). WRAP was inspected locally at `b9a9d3691394916fd9485146e3e719f9a3bd5ea2` at the same paths; that repository is private. An authorized reviewer must inspect those WRAP sources before certifying its migration instructions. Neither source inspection nor this guide proves host runtime compatibility.

1. In a host-owned branch, install `tsx` as an API development dependency through that project's Docker wrapper: run `npm install --save-dev tsx` in the API service, then commit `api/package.json` and its lockfile. Verify the installed runner's Node requirement against the development image. This repository uses Node 24.15; do not infer the host's deployed version from it.
2. Add `"tsx": "tsx"` to `api/package.json`. Replace the `ts_node` method and `"ts-node"` command mapping in the host's `bin/dev` with the method below. Update documented/manual script invocations to `bin/dev tsx path/to/script.ts`. Do not add a misleading `ts-node` compatibility alias.

   ```ruby
   def tsx(*args, **kwargs)
     run(*%w[api npm run tsx --], *args, **kwargs)
   end
   ```

3. Keep the host's package module format, `api/tsconfig.json`, aliases, `build`, and deployed Node entrypoint unchanged. Run from the API working directory so `tsx` finds its configuration; use `--tsconfig` for a different configuration. Do not copy this repository's `@example-app/*` alias into a host.
4. Keep `check-types` as an explicit required check. `tsx` transpiles without type checking and does **not** emit `emitDecoratorMetadata`; `--files` and `--logError` are not replacement flags. Audit decorators and runtime reflection before moving a script. Code relying on emitted design metadata must retain its TypeScript compiler path. Exercise imports, aliases, model initialization, and actual script results in the host's isolated development/test environment.
5. The first cutover is only the manual script command. Keep `ts-node`, `ts-node-dev`, and `tsconfig-paths` while initializers, Knex, or server commands still use them. A later server cutover can use `tsx watch src/server.ts`, `tsx watch src/jobs-server.ts` for WRAP, or `tsx watch src/scheduler.ts` for Travel Authorization, preserving required debugger options and container exposure policy. Verify restart after an edit, shutdown, health, authentication, and the job/scheduler lifecycle before adopting those changes.
6. Migrate initializer and Knex commands separately only after proving their dynamic TypeScript loading and database lifecycle. Use the host's isolated test database, not production or development data, for migration/seed checks. Remove old scripts and dependencies only after their last caller is migrated. Roll back the affected command and lockfile together if the new runner changes behavior.

For finite runtime verification, choose a host-owned entrypoint that imports the application without listening, starting workers, running migrations, or opening persistent connections. Configure `.marlens-verifications.json` to execute that entrypoint through the host wrapper, with `fullTypecheck` pointing to its existing type check. This repository's `check-runtime` imports `example-app/app.ts`; it is not a substitute for live startup verification. Keep lint bindings in the owning package's `.omp-verifier.json`.

## Ownership boundaries

The package owns reusable config values only. Consumer applications continue to own `bin/dev` or other development wrappers, Docker/Compose services, service names, gateway and DevHelper behavior, credentials, cloud helpers, host-specific database setup, and deployment configuration. Reuse those owners' documented commands; do not copy them into this package or these presets.

For shared authoring and review doctrine, see [MSSRT issue #725](https://github.com/klondikemarlen/marlens-skills-rules-and-tools/issues/725). This executable preset is not a substitute for that doctrine and does not require its full plugin.
