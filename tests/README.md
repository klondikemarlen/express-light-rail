# Tests and development tooling

This package uses Vitest, not Jest. Run tests through `bin/dev test -- --run` so Compose selects the test database. The Vite configuration owns mock clearing, reset, restore, and stub cleanup. Database suites prepare the example's SQL Server database with its production migration path and clean their scenario records between tests; unrelated unit tests do not acquire database hooks.

Test files live under `tests/` and mirror `src/`; use `{filename}.test.ts`. Keep behavior tests close to the source responsibility they exercise. Use `describe`/`test` and Arrange/Act/Assert comments for behavioral cases. Prefer assertions about externally observable behavior over configuration snapshots or private implementation details.

For shared test-authoring and review doctrine, see [MSSRT issue #725](https://github.com/klondikemarlen/marlens-skills-rules-and-tools/issues/725). This short guide records this package's actual runner and lifecycle rather than reproducing that full manual.

## Commands

```sh
bin/dev test -- --run
bin/dev check-types
bin/dev npm run lint
```

The optional shared tooling entrypoints and host-specific composition are documented in [Tooling presets](../docs/tooling.md). To exercise their packed-artifact consumer fixtures after the package is built and the package subpath exports are present:

```sh
bin/dev run --rm test_app bash tests/fixtures/tooling/postgresql/scripts/smoke.sh
bin/dev run --rm test_app bash tests/fixtures/tooling/tsql/scripts/smoke.sh
```

Each fixture installs the packed package in a temporary consumer, checks a valid TypeScript file and the expected shared TypeScript lint diagnostic, formats TypeScript plus SQL in its configured dialect, and runs a behavioral test using source/test aliases and host lifecycle hooks. The PostgreSQL fixture also compiles a native CommonJS consumer of the public declarations without skipping dependency declaration checks. The fixtures intentionally keep database setup absent: a real host must retain its own database lifecycle, isolation, and concurrency configuration.
