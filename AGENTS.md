# AGENTS.md - express-light-rail

## Purpose

`express-light-rail` is an installable TypeScript package that centralizes Rails-like backend primitives for Express applications. It should provide the boring framework layer that host apps can install instead of reimplementing controller, policy, service, serializer, job, and request-helper patterns.

Keep the package focused. Host applications own their domain models, concrete routes, integrations, queue workers, and database setup. This package owns reusable Express-over-TypeScript conventions.

## Current Package Surface

- `API` - base controller that maps Express route handlers to instance actions.
- `BaseApiError` - structured API error shape: `{ error: { code, msg, meta } }`.
- `BasePolicy` and `PolicyFactory` - Rails/Pundit-like action checks, policy scopes, and permitted attributes.
- `BaseService` - service object base with `ServiceName.perform(args)` call-site ergonomics.
- `BaseSerializer` - response serializer base with single-record/array `.perform` and preload checks.
- `BaseJob` - configurable ActiveJob-like base with `perform`, `performNow`, `performLater`, and `queueAs`.
- Controller helpers - `buildWhere`, `buildFilterScopes`, `buildOrder`, `buildPagination`, `determineLimit`.
- `deepPick` - nested permitted-attribute picker used by policies.

## Code Style

- TypeScript ESM only.
- Named exports only. Do not add default exports.
- Use `@/` path aliases for internal imports.
- Use full words. No abbreviations in table names, variable names, public APIs, or docs.
- Prefer small, boring modules near the code they support.
- Avoid compatibility shims. Make clean cutovers and update all call sites.
- Keep public APIs stable and type-safe; avoid `any`, `@ts-ignore`, and unchecked casts.
- Use the configured Winston logger; do not use `console.*` in package code.

## Architecture Direction

The package should make this request flow easy for host applications:

```text
Route -> Controller -> Policy -> Service -> Model -> Serializer -> Response
```

Controller responsibilities:

- Map RESTful route handlers to instance methods: `index`, `show`, `create`, `update`, `destroy`.
- Expose request helpers: `params`, `query`, `pagination`, `buildWhere`, `buildFilterScopes`, and `buildOrder`.
- Orchestrate policy checks, service calls, and response serialization.
- Avoid embedding business rules.

Policy responsibilities:

- Keep authorization out of controllers and services.
- Use `PolicyFactory(Model)` for scoped model access.
- Implement static `policyScope(user, ...args)` for index/list visibility rules.
- Implement `permittedAttributes()` for create/update allow-lists.

Service responsibilities:

- Put business logic and multi-step mutations in services.
- Call services via `ServiceName.perform(args)`.
- Prefer per-action service classes for operations that will grow.

Serializer responsibilities:

- Own API response shape, not persistence or authorization.
- Use `AsIndex`, `AsShow`, and `AsReference` output type names.
- Destructure required associations first, then fail with explicit preload errors.
- Serialize nested associations into named locals before the final returned object.

Job responsibilities:

- Put asynchronous work behind `JobName.perform(...)` and `JobName.performLater(...)`.
- Configure host-owned queue persistence with `JobBackend`.
- Keep pub/sub channels and workers in the host application until a reusable abstraction is proven.

Route design:

- Prefer namespaced CRUD controllers over custom verbs on large controllers.
- Example: `Forms.Estimates.GenerateController.create` for `POST /api/forms/:formId/estimates/generate`.

## Tests

- Vitest only.
- Mirror source structure under `tests/`.
- Use `describe`/`test` with Arrange/Act/Assert comments for behavior tests.
- Test public behavior and edge cases, not implementation plumbing.
- Run focused tests for changed code, plus package checks before yielding.

## Commands

Prefer local npm commands for package work because Docker may be used by other projects concurrently.

```bash
npm install
npm run check-types
npm run test -- --run
npm run build
npm pack --dry-run --json
```

Docker wrapper scripts may exist for local development, but they are not required for package verification.

## Packaging

- Build with Vite library mode.
- Publish ESM, CommonJS, and TypeScript declarations from `dist/`.
- Keep Express and Sequelize as peer dependencies so host applications control their framework and ORM versions.
- Do not publish generated scaffolds or app-specific code.

## Commits

- Commit in the smallest atomic slice that contains a meaningful change.
- Keep package tooling, public API behavior, helper extraction, and docs in separate commits when possible.
- Do not commit unrelated local tooling preferences with package behavior.
