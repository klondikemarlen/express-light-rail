# express-light-rail (a.k.a. Express like Rails)

Rails-inspired controller, policy, and service primitives for Express applications.

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

## Concepts

Use the package to keep an Express API on a predictable request path:

```text
Route → Controller → Policy → Service → Model → Serializer → Response
```

- Controllers map resource routes to instance actions: `index`, `show`, `create`, `update`,
  and `destroy`.
- Policies keep authorization and permitted attributes out of controllers.
- Services hold business logic and multi-step mutations behind `ServiceName.perform(args)`.
- Serializers stay in the host application; this package only provides the backend primitives.

For custom actions, prefer namespaced CRUD controllers over one-off verbs:

```ts
router
  .route("/api/forms/:formId/estimates/generate")
  .post(Forms.Estimates.GenerateController.create)
```

That shape keeps routes searchable and lets controllers stay small.

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

export class CreateUserService extends BaseService {
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

1. Generate a new version:

   ```bash
   npm version patch -m "some message"
   npm version minor -m "some message"
   npm version major -m "some message"
   ```

2. Publish to npm:

   ```bash
   npm publish
   ```

`prepublishOnly` runs type checks, the Vitest suite, and the package build.
