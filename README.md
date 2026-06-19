# express-light-rail (a.k.a. Express like Rails)

Rails-inspired controller, policy, service, serializer, and job primitives for Express applications.

If you are asking yourself, "Should I be using Rails instead?", the answer is yes. This
library is a focused shim for teams that need Express and TypeScript but still want a few
boring Rails conventions.

## Install

```bash
npm install express-light-rail
```

Peer dependencies:

```bash
npm install express @sequelize/core
```

The package publishes ESM and CommonJS builds from `dist/`, plus TypeScript declarations.

Detailed convention docs live beside the source:

- [`src/base-controller/README.md`](src/base-controller/README.md)
- [`src/base-policy/README.md`](src/base-policy/README.md)
- [`src/base-service/README.md`](src/base-service/README.md)
- [`src/base-serializer/README.md`](src/base-serializer/README.md)
- [`src/base-job/README.md`](src/base-job/README.md)

## Concepts

Use the package to keep an Express API on a predictable request path:

```text
Route → Controller → Policy → Service → Model → Serializer → Response
```

- Controllers map resource routes to instance actions: `index`, `show`, `create`, `update`,
  and `destroy`, while route files stay normal Express `router.route(...).get(...).post(...)`
  declarations.
- Policies keep authorization and permitted attributes out of controllers.
- Services hold business logic and multi-step mutations behind `ServiceName.perform(args)`.
- Serializers own response shape, association preload checks, and list/detail/reference views.
- Jobs provide `perform`, `performNow`, `performLater`, and `queueAs` without choosing a queue
  backend for the host application.

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

## Extraction roadmap

The next host-agnostic pieces worth extracting from WRAP, travel-authorization, and ELCC are:

- API router middleware: shared 404 and error-handler factories that preserve Express routing and
  host-specific authentication/database error mapping.
- Query conventions: small helpers for naming, composing, and testing SQL literal builders without
  forcing class-based query objects.
- Job argument serialization: optional Sequelize model argument serialization for `BaseJob`, while
  keeping queue persistence and workers host-owned.
- Front-end API contracts: shared TypeScript query/envelope types that mirror controller helper
  behavior without pulling in Vue or React.

Keep these out until they remove duplicated code in at least two host apps. Pub/sub channels,
workers, Auth0/JWT details, and app bootstrapping still belong in host applications.


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
