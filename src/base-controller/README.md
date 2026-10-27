# Base Controller

`BaseController<TModel, ControllerRequest>` turns static Express handlers into controller instances.

```ts
router.route("/api/users").get(UsersController.index).post(UsersController.create)
```

`UsersController.index` is still a normal Express handler. The static getter builds a controller instance and calls `#index()`. Use policies, services, and serializers as needed; installing error middleware does not require moving existing routes or adopting those controller conventions.

## Host application controllers

The package supplies the controller actions, not authentication or a universal identity field.
Keep the request field your host already establishes and expose it on a host-owned application
base. A host using `currentUser` can define:

```ts
import { type Request } from "express"
import type { Model } from "@sequelize/core"
import { BaseController } from "express-light-rail"

import type { User } from "@/models/index.js"

type AuthenticatedRequest = Request & { currentUser: User }

abstract class ApplicationController<TModel extends Model = never> extends BaseController<
  TModel,
  AuthenticatedRequest
> {
  protected get currentUser(): User {
    return this.request.currentUser
  }
}

class UsersController extends ApplicationController<User> {
  // Resource actions use this.currentUser and retain host policy/error/message ownership.
}
```

A host whose middleware sets `request.user` can expose `user` instead; do not rename or copy host
identity fields to fit the package. The application base is a thin accessor, not authentication,
authorization, error formatting, or response-message behavior.

## Request cancellation

`BaseController` provides an inherited `signal` and a typed `request.signal`. If a valid signal is
already present on the request, the controller reuses that exact signal and leaves its lifecycle to
the host. Otherwise, the package creates one request signal, aborting it when the request aborts or
the response closes before it has finished. A normal finished response does not abort. Controllers
need no per-route signal middleware or wrapper.

This signal describes request cancellation; it does not automatically cancel service work, ORM
queries, database operations, or transactions. Pass `this.signal` explicitly to a service or driver
that cooperates with `AbortSignal`; that service or driver owns how it stops work. Transaction
ownership remains with the host.

## Breaking upgrade

When upgrading from 0.9 or earlier, change both old controller-class forms directly:

```ts
import { BaseController } from "express-light-rail"

class UsersController extends BaseController<User, AuthenticatedRequest> {}
// Replaces either `API<User, AuthenticatedRequest>` or
// `BaseController.API<User, AuthenticatedRequest>`.
```

The removed class export and namespace are not retained as aliases.

## Responsibilities

Controllers should:

- read `params`, `query`, and `request.body`
- build query options with `pagination`, `buildWhere`, `buildFilterScopes`, and `buildOrder`
- call policies before exposing or mutating records
- call services for business logic
- call serializers before responding

Controllers should not:

- hide routes behind a custom DSL
- embed authorization rules
- own multi-step business workflows
- format presentation details better handled by serializers or the front end

## Errors

Throw `BaseApiError` for expected API failures. Its existing response body is:

```json
{ "error": { "code": "some_code", "msg": "Message", "meta": {} } }
```

Since 0.4.0, controller action handlers pass thrown or rejected errors to Express with `next(error)`. They do not format error responses or log implicitly. Install `createApiErrorHandler()` after your routes and controllers, or use your existing host error middleware there. The package handler preserves `BaseApiError` responses and returns a generic `internal_server_error` for unknown errors. See the [incremental Express setup](../../README.md#api-error-handling) for host-owned error classification and logging.

## Custom actions

Prefer a namespaced CRUD controller over adding verbs to a large primary controller:

```ts
router
  .route("/api/forms/:formId/estimates/generate")
  .post(Forms.Estimates.GenerateController.create)
```
