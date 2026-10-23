# Base Controller

`API` turns static Express handlers into controller instances.

```ts
router.route("/api/users").get(UsersController.index).post(UsersController.create)
```

`UsersController.index` is still a normal Express handler. The static getter builds a controller instance and calls `#index()`. Use policies, services, and serializers as needed; installing error middleware does not require moving existing routes or adopting those controller conventions.

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

Since 0.4.0, `API` action handlers pass thrown or rejected errors to Express with `next(error)`. They do not format error responses or log implicitly. Install `createApiErrorHandler()` after your routes and controllers, or use your existing host error middleware there. The package handler preserves `BaseApiError` responses and returns a generic `internal_server_error` for unknown errors. See the [incremental Express setup](../../README.md#api-error-handling) for host-owned error classification and logging.

## Custom actions

Prefer a namespaced CRUD controller over adding verbs to a large primary controller:

```ts
router
  .route("/api/forms/:formId/estimates/generate")
  .post(Forms.Estimates.GenerateController.create)
```
