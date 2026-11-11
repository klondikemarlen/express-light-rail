# Tests and development tooling

This package uses Vitest, not Jest. Run tests through `bin/dev test -- --run` so Compose selects the test database. The Vite configuration owns mock clearing, reset, restore, and stub cleanup. Database suites prepare the example's PostgreSQL database with its production migration path and permanently remove their scenario records, including soft-deleted rows, between tests; unrelated unit tests do not acquire database hooks.

Test files live under `tests/` and mirror `src/`; use `{filename}.test.ts`. The example's HTTP suites use the `.controller.test.ts` suffix. Keep behavior tests close to the source responsibility they exercise. Use `describe`/`test` and Arrange/Act/Assert comments for behavioral cases. Prefer assertions about externally observable behavior over configuration snapshots or private implementation details.

For shared test-authoring and review doctrine, see [MSSRT issue #725](https://github.com/klondikemarlen/marlens-skills-rules-and-tools/issues/725). This short guide records this package's actual runner and lifecycle rather than reproducing that full manual.

Path aliases use `compilerOptions.paths` targets relative to the configuration file that declares them. The test, example, and tooling fixture configurations do not need the deprecated `baseUrl` option or an `ignoreDeprecations` suppression. Preserve those relative targets when overriding aliases in an extending configuration.

## Discussion-board factories

The example's request tests use [Factory Shark](https://github.com/klondikemarlen/factory-shark) factories in [`example-app/factories/`](example-app/factories/), backed by real Sequelize models and the Compose-selected PostgreSQL test database. The development ORM and PostgreSQL dialect are pinned together at `7.0.0-alpha.48`, the Sequelize 7 release supported by Factory Shark `2.0.0`. These are development dependencies; Factory Shark is not a package runtime dependency or public export, and the package's Sequelize peer range remains unchanged.

Arrange records inside each test. Shared hooks run migrations and delete scenario records without resetting identities; they do not create scenario data or call the runnable application's seed function. For example:

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

`create()` persists real records. Without parent overrides, thread and comment factories create their declared `belongsTo` associations; supplying existing foreign keys reuses those records. `build()` returns unsaved models without database writes. Keep these factories pointed at the dedicated test database, never the application's development database.

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
