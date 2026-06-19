# Base Controller

`API` turns static Express handlers into controller instances.

```ts
router.route("/api/users").get(UsersController.index).post(UsersController.create)
```

`UsersController.index` is still a normal Express `RequestHandler`. The static getter builds a controller instance and calls `#index()`.

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

Throw `BaseApiError` for expected API failures. The base action handler serializes it as:

```json
{ "error": { "code": "some_code", "msg": "Message", "meta": {} } }
```

Unexpected errors become `internal_server_error` responses and are logged.

## Custom actions

Prefer a namespaced CRUD controller over adding verbs to a large primary controller:

```ts
router
  .route("/api/forms/:formId/estimates/generate")
  .post(Forms.Estimates.GenerateController.create)
```
