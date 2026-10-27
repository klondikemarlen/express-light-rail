# Tests and development tooling

This package uses Vitest, not Jest. The root `test` script runs Vitest; `npm run test -- --run` performs a non-watch run. The root Vite config uses `tests/global-setup.ts` for process-level setup and `tests/setup.ts` for test setup, with test globals enabled. The global setup owns database startup/cleanup where needed; test setup installs per-test hooks. Its mock clearing, reset, restore, and stub cleanup behavior is configured in `vite.config.ts`.

Test files live under `tests/` and mirror `src/`; use `{filename}.test.ts`. Keep behavior tests close to the source responsibility they exercise. Use `describe`/`test` and Arrange/Act/Assert comments for behavioral cases. Prefer assertions about externally observable behavior over configuration snapshots or private implementation details.

For shared test-authoring and review doctrine, see [MSSRT issue #725](https://github.com/klondikemarlen/marlens-skills-rules-and-tools/issues/725). This short guide records this package's actual runner and lifecycle rather than reproducing that full manual.

Path aliases use `compilerOptions.paths` targets relative to the configuration file that declares them. The test, example, and tooling fixture configurations do not need the deprecated `baseUrl` option or an `ignoreDeprecations` suppression. Preserve those relative targets when overriding aliases in an extending configuration.

## Discussion-board factories

The example's request tests use [Factory Shark](https://github.com/klondikemarlen/factory-shark) factories in [`example-app/factories/`](example-app/factories/), backed by real Sequelize models and an isolated in-memory SQLite database. The development ORM and SQLite dialect are pinned together at `7.0.0-alpha.48`, the Sequelize 7 release supported by Factory Shark `2.0.0`. These are development dependencies; Factory Shark is not a package runtime dependency or public export, and the package's Sequelize peer range remains unchanged.

Arrange records inside each test. Shared hooks reset the schema but do not create scenario data or call the runnable application's seed function. For example:

```ts
import { commentFactory } from "@tests/example-app/factories/comment-factory.js"
import { threadFactory } from "@tests/example-app/factories/thread-factory.js"
import { userFactory } from "@tests/example-app/factories/user-factory.js"

const author = await userFactory.create({
  username: "alice",
})
const thread = await threadFactory.create({
  authorId: author.id,
})
const comment = await commentFactory.create({
  authorId: author.id,
  threadId: thread.id,
})
```

`create()` persists real records. Without parent overrides, thread and comment factories create their declared `belongsTo` associations; supplying existing foreign keys reuses those records. `build()` returns unsaved models without database writes. Keep these factories pointed at disposable test persistence, not the runnable application's file database.

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
