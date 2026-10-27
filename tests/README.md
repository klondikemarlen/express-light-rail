# Tests and development tooling

This package uses Vitest, not Jest. The root `test` script runs Vitest; `npm run test -- --run` performs a non-watch run. The root Vite config uses `tests/global-setup.ts` for process-level setup and `tests/setup.ts` for test setup, with test globals enabled. The global setup owns database startup/cleanup where needed; test setup installs per-test hooks. Its mock clearing, reset, restore, and stub cleanup behavior is configured in `vite.config.ts`.

Test files live under `tests/` and mirror `src/`; use `{filename}.test.ts`. Keep behavior tests close to the source responsibility they exercise. Use `describe`/`test` and Arrange/Act/Assert comments for behavioral cases. Prefer assertions about externally observable behavior over configuration snapshots or private implementation details.

For shared test-authoring and review doctrine, see [MSSRT issue #725](https://github.com/klondikemarlen/marlens-skills-rules-and-tools/issues/725). This short guide records this package's actual runner and lifecycle rather than reproducing that full manual.

Path aliases use `compilerOptions.paths` targets relative to the configuration file that declares them. The test, example, and tooling fixture configurations do not need the deprecated `baseUrl` option or an `ignoreDeprecations` suppression. Preserve those relative targets when overriding aliases in an extending configuration.

## Commands

```sh
npm run test -- --run
npm run check-types
npm run lint
```

The optional shared tooling entrypoints and host-specific composition are documented in [Tooling presets](../docs/tooling.md). To exercise their packed-artifact consumer fixtures after the package is built and the package subpath exports are present:

```sh
bash tests/fixtures/tooling/postgresql/scripts/smoke.sh
bash tests/fixtures/tooling/tsql/scripts/smoke.sh
```

Each fixture installs the packed package in a temporary consumer, checks a valid TypeScript file and the expected shared TypeScript lint diagnostic, formats TypeScript plus SQL in its configured dialect, and runs a behavioral test using source/test aliases and host lifecycle hooks. The PostgreSQL fixture also compiles a native CommonJS consumer of the public declarations without skipping dependency declaration checks. The fixtures intentionally keep database setup absent: a real host must retain its own database lifecycle, isolation, and concurrency configuration.
