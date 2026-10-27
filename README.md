# express-light-rail (a.k.a. Express like Rails)

Rails-inspired controller, policy, service, serializer, and job primitives for Express applications.

If you are asking yourself, "Should I be using Rails instead?", the answer is yes. This
library is a focused shim for teams that need Express and TypeScript but still want a few
helpful Rails conventions.

Adopt one primitive at a time. Keep your Express application, routers, middleware, and unmigrated handlers; controllers, policies, services, serializers, and jobs are independent building blocks, not an all-or-nothing framework.

## Install

```bash
npm install express-light-rail
```

Peer dependencies:

```bash
npm install express @sequelize/core
```

The package publishes ESM and CommonJS builds from `dist/`, with matching TypeScript declaration entrypoints for native `Node16` and `NodeNext` resolution. CommonJS applications do not need to switch to ESM to consume the framework primitives.

Detailed convention docs live beside the source:

- [`src/base-controller/README.md`](src/base-controller/README.md)
- [`src/base-policy/README.md`](src/base-policy/README.md)
- [`src/model-helpers/README.md`](src/model-helpers/README.md)
- [`src/base-service/README.md`](src/base-service/README.md)
- [`src/base-serializer/README.md`](src/base-serializer/README.md)
- [`src/base-job/README.md`](src/base-job/README.md)
- [Opt-in lint, format and Vitest presets](docs/tooling.md)
- [Browser-safe query, policy, and channel packet contracts](docs/browser-contracts.md)
- [Optional BullMQ jobs, outbox handoff, and worker lifecycle](docs/jobs.md)
- [One authenticated Socket.IO channel with typed resource packets](docs/channels.md)

## Concepts

Use the package to keep an Express API on a predictable request path:

```text
Route → Controller → Policy → Service → Model → Serializer → Response
```

- Controllers map resource routes to instance actions: `index`, `show`, `create`, `update`,
  and `destroy`, while route files stay normal Express `router.route(...).get(...).post(...)`
  declarations.
- Policies keep authorization and permitted attributes out of controllers.
- Model helpers add concrete scope typing and scoped primary-key reloads without replacing a model's Sequelize superclass; definitions and database setup remain host-owned.
- Services hold business logic and multi-step mutations behind `ServiceName.perform(args)`.
- Serializers own response shape, association preload checks, and list/detail/reference views.
- Jobs provide `perform`, `performNow`, `performLater`, and non-mutating queue/backend overrides. Use a host backend or opt into the BullMQ runtime.
- Channels carry typed, labeled resource packets over one authenticated application namespace through an optional Socket.IO integration. Hosts authorize each resource event and own its serialized payload; a model does not need its own channel class.

Start with the [incremental adoption guide](docs/adoption.md) for host ownership,
audited compatibility boundaries, a runnable Express example, and consumer cutover recipes.

Routes should stay visibly Express-shaped. `express-light-rail` gives controllers Rails-like
instance actions, but it does not hide `Router` behind a DSL:

```ts
router.route("/api/users").get(UsersController.index).post(UsersController.create)

router
  .route("/api/forms/:formId/estimates/generate")
  .post(Forms.Estimates.GenerateController.create)
```

The second route is still a `create` action on a namespaced controller. That keeps migration
small for Express users while nudging route design toward Rails resources.

## Conventions from sibling apps

These conventions are intentionally aligned with WRAP, travel-authorization, and ELCC-style APIs:

- Keep the main request path explicit: controller → policy → service → serializer.
- Use serializer output types named like `UserAsIndex`, `UserAsShow`, and `UserAsReference`.
- Destructure required associations at the top of serializers, then fail with an explicit preload
  message before building the response.
- Serialize nested associations into named locals before the final returned object.
- Put complex database reads in query objects in the host app; expose reusable request helper
  primitives from this package.
- Treat front-end API contract types as a separate layer. This package exports backend primitives
  that make those contracts stable, but it does not own Vue/React component patterns.

## API error handling

Error handling is opt-in and stays in Express middleware order. Keep ordinary Express routes, then add the package handlers around the API routes without changing policies, services, or database error conventions:

```ts
import express, { Router } from "express"
import { BaseApiError, createApiErrorHandler, createApiNotFoundHandler } from "express-light-rail"

const app = express()
const api = Router()

api.get("/users/:id", (request, response) => {
  response.json({ id: request.params.id })
})

app.use("/api", api)
app.use("/api", createApiNotFoundHandler())
app.use("/api", createApiErrorHandler())
app.use(express.static("public"))
```

Install the API 404 immediately after the API router so an unknown `/api` path does not fall through to a static file or SPA fallback. Install the error handler after routes and controllers. The package handler preserves the public `BaseApiError` status and body, and maps unknown errors to a generic `internal_server_error` response without internal messages or stacks. You can instead keep your existing Express error middleware in that position and omit `createApiErrorHandler()`.

The optional hooks keep logging and public error classification host-owned. Both hooks run synchronously and receive the original error and Express request. Return `undefined` from `classifyError` to retain the standard mapping. Map only errors whose public meaning you know; do not copy arbitrary `.message` values into a response:

```ts
app.use(
  "/api",
  createApiErrorHandler({
    onError(error, request) {
      logger.error("API request failed", {
        error,
        method: request.method,
        path: request.originalUrl,
      })
    },
    classifyError(error) {
      if (error instanceof HostRecordMissingError) {
        return new BaseApiError("record_not_found", "Record Not Found", {}, 404)
      }
    },
  })
)
```

Adopt incrementally: first install the handlers around existing Express routes, then move individual routes to `API` controllers when useful. Since 0.4.0, controllers call `next(error)` instead of responding or logging internally, so install the package handler or retain a host error handler before upgrading controller-based routes. Errors after response headers have been sent are delegated to the next Express error handler.

## Extraction roadmap

Common browser query, pagination, order, policy, and labeled channel packet contracts are available through
`express-light-rail/contracts`; application packet catalogs, endpoint envelopes and model-specific fields remain host-owned.

The next host-agnostic pieces worth extracting from WRAP, travel-authorization, and ELCC are:

- Query conventions: small helpers for naming, composing, and testing SQL literal builders without
  forcing class-based query objects.
- Job argument serialization: optional ORM-specific model reference serialization beyond the registered host deserializers.

Keep future extractions out until they remove duplicated code in at least two host apps. The [optional jobs runtime](docs/jobs.md) and [optional channels](docs/channels.md) provide reusable mechanisms; concrete workers, persistence, queue policy, Auth0/JWT details, domain events, and application bootstrapping remain host-owned.

## Example

```ts
import { type Request } from "express"
import { API, BaseService, PolicyFactory } from "express-light-rail"

import { User } from "@/models/index.js"

type ControllerRequest = Request & {
  currentUser: User
}

export class UsersPolicy extends PolicyFactory<User, User>(User) {
  static policyScope(currentUser: User) {
    if (currentUser.isAdmin) return {}

    return {
      where: {
        companyId: currentUser.companyId,
      },
    }
  }

  permittedAttributes() {
    return ["name", "email"]
  }
}

export class CreateUserService extends BaseService<Promise<User>> {
  constructor(private attributes: Partial<User>) {
    super()
  }

  perform() {
    return User.create(this.attributes)
  }
}

export class UsersController extends API<User, ControllerRequest> {
  async create() {
    const policy = new UsersPolicy(this.request.currentUser, User.build())
    const attributes = policy.permitAttributesForCreate(this.request.body)
    const user = await CreateUserService.perform(attributes)

    return this.response.status(201).json({
      user,
      policy,
    })
  }
}
```

## Serializer example

```ts
import { BaseSerializer } from "express-light-rail"

type UserAsShow = {
  id: number
  name: string
  organization: {
    id: number
    name: string
  }
}

export class ShowSerializer extends BaseSerializer<User, UserAsShow> {
  perform(): UserAsShow {
    const organization = this.requiredAssociation(
      this.record.organization,
      "Expected user organization association to be preloaded."
    )

    return {
      id: this.record.id,
      name: this.record.name,
      organization: {
        id: organization.id,
        name: organization.name,
      },
    }
  }
}
```

## Job example

```ts
import { BaseJob, type JobBackend, type JobPayload } from "express-light-rail"

const backend: JobBackend = {
  enqueue(payload: JobPayload) {
    return BackgroundJob.create({
      queueName: payload.queueName,
      jobName: payload.jobName,
      jobData: payload.jobData,
    })
  },
}

export class SendWelcomeEmailJob extends BaseJob<void> {
  static override queueName = "mailers"

  constructor(private readonly userId: number) {
    super()
  }

  perform(): void {
    // send email
  }
}

SendWelcomeEmailJob.configure({ backend })
await SendWelcomeEmailJob.performLater(1)
await SendWelcomeEmailJob.queueAs("slow-mailers").performLater(1)
```

## Development

### Without Docker

Use the project-local Node.js version selected by `.tool-versions`; run `asdf install nodejs` if it is not installed. No shell-level `ASDF_NODEJS_VERSION` override is needed.

```bash
npm install
npm run check-types
npm run test -- --run
npm run build
npm pack --dry-run
```

### With Docker

This repo still has the local `bin/dev` wrapper, but Docker is optional for package work.

1. Set up `asdf` and install `ruby`.
2. Set up `direnv` with an `.envrc` containing `PATH_add bin`.
3. Build with `dev build`.
4. Test with `dev test`.

## Publishing

Publishing is intentionally boring npm:

1. Confirm you are authenticated:

   ```bash
   npm whoami
   ```

   If authentication has expired, run `npm login` and complete its browser challenge. Release automation may invoke both login and publish; account approval and two-factor authentication still belong to the maintainer. Keep credentials out of versioned files.

2. Confirm the registry version and choose the next semver version:

   ```bash
   npm view express-light-rail version
   ```

3. Generate a version commit and tag:

   ```bash
   npm version patch -m ":bookmark: Release %s."
   npm version minor -m ":bookmark: Release %s."
   npm version major -m ":bookmark: Release %s."
   ```

4. Publish:

   ```bash
   npm publish
   ```

5. Push the version commit and tag:

   ```bash
   git push origin main --follow-tags
   ```

`prepublishOnly` runs type checks, the Vitest suite, and the package build. Run
`npm pack --dry-run --json` first when changing package contents.

After npm accepts a publication, allow for its [publish-time scanning delay](https://github.blog/changelog/2026-07-28-npm-publish-time-malware-scanning-and-dual-use-metadata/) before expecting the version to be installable. A temporary registry lookup or install `404` after an accepted publish is not proof that publication failed; do not republish or bump the version merely to bypass that delay. Fetch the exact released tarball once available, verify its commit and artifact identity, and run the relevant consumer smoke checks before closing the delivery issue.
