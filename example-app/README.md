# Discussion board example

Build a small Rails-style API with Express Light Rail: users start discussion threads, add comments, and edit or delete their own posts. The example uses real Sequelize models and a local SQLite database. It demonstrates the controller, policy, service, model, and serializer conventions together without requiring a separate database server.

## Run the app

From a checkout of this repository, run these commands at the repository root, not inside `example-app/`:

```sh
npm install
npm run build
npm run example
```

Use the Node.js version in [`.tool-versions`](../.tool-versions); `asdf install nodejs` installs it when using asdf. Build the package before starting the example so its `express-light-rail` imports resolve to the local build.

The API listens at `http://localhost:3000`. To use another port, run `API_PORT=3352 npm run example` and adjust the request URLs below. The command compiles before starting; stop with Ctrl-C and restart after code changes.

SQLite stores data in `.example-app/discussion-board.sqlite`, which is ignored by Git. Startup runs the ordered [initializers](initializers/): ensure the database, then select seeds for `NODE_ENV` (default `development`). Development seeds a fresh database with Alice, Bob, one welcome thread, and Bob's comment. Production and test have empty seed lists; they never create demo accounts. Restarting does not reset existing records. To explore a separate empty database, choose a new path:

```sh
EXAMPLE_DATABASE_STORAGE=/tmp/my-discussion-board.sqlite npm run example
```

No Redis, external account, environment file, or database container is required. Schema synchronization is convenient for this example; production applications should own migrations, backups, configuration, and deployment.

## Application boundary and authentication

The framework runtime remains minimal. This example owns its Helmet security headers, credentialed CORS policy, bounded query/JSON/URL-encoded/multipart parsing, completion logging, authentication, status endpoint, and frontend hosting.

[`POST /api/session`](controllers/sessions-controller.ts) accepts a username and password as JSON or form fields. Login preserves credential strings; resource-only form normalization runs afterward. [`Users.AuthenticateService`](services/users/authenticate-service.ts) checks the salted scrypt password hash; the [session service](services/sessions/create-service.ts) returns a signed, 15-minute JWT. Send that token in the `Authorization: Bearer` header on subsequent API requests.

The [authorization middleware](middlewares/authorization-middleware.ts) verifies HS256 signature, issuer, audience, age, and expiry, then calls a service to load the existing user into `request.currentUser`. `ApplicationController` only exposes that context; it does not override `beforeAction()` or dispatch. Resource policies still own permissions.

This is a small local identity provider, not OAuth/OIDC or a replacement for Auth0's full account platform. Auth0 is a common production choice: its token verification and local-user mapping would sit at the same authorization middleware/service boundary. This example does not require or implement Auth0.

Without `EXAMPLE_JWT_SECRET`, development/test generates a fresh signing key each process; restart invalidates existing tokens, so log in again. To preserve tokens across restarts, supply a stable secret containing at least 32 bytes. Production requires it. Generate a strong value with `openssl rand -base64 32` and configure it outside versioned files.

There are no cookies, refresh tokens, account-registration routes, or token revocation. Logout means discarding the token; a stolen token remains usable until expiry. HTTPS, login throttling, account recovery, secret rotation, and production provisioning remain application responsibilities. Passwords and hashes are never serialized; request logs exclude query strings, headers, and bodies. `FRONTEND_URL` selects the allowed CORS origin.

`GET /_status` and `POST /api/session` are public. Other `/api` requests require a bearer token, including unknown paths; authenticated misses return JSON 404 and never become frontend pages. Query/body tokens and `x-user-id` are not accepted. `EXAMPLE_WEB_DIRECTORY` selects static assets: production serves the index for extensionless HTML GET routes, while development serves a 404 page. Missing assets remain 404s.

## Meet the users and models

| Model   | Fields                               | Relationship                         |
| ------- | ------------------------------------ | ------------------------------------ |
| User    | `id`, `username`, `name`             | Authors threads and comments.        |
| Thread  | `id`, `title`, `body`, `authorId`    | Belongs to an author; has comments.  |
| Comment | `id`, `body`, `threadId`, `authorId` | Belongs to one thread and an author. |

The fresh development database includes `alice` / `alice-password` and `bob` / `bob-password`. These are public example credentials, not production accounts. Log in as each user:

```sh
curl -i -H 'content-type: application/json' \
  -d '{"username":"alice","password":"alice-password"}' http://localhost:3000/api/session
curl -i -H 'content-type: application/json' \
  -d '{"username":"bob","password":"bob-password"}' http://localhost:3000/api/session
```

Both return HTTP 201 with `{ "accessToken": "...", "tokenType": "Bearer", "expiresIn": 900 }` and `Cache-Control: no-store`. Copy the returned tokens into variables in your terminal:

```sh
export ALICE_TOKEN='<Alice accessToken>'
export BOB_TOKEN='<Bob accessToken>'
```

Existing pre-login databases retain their users and posts. Startup adds a nullable password-hash column, but never assigns known passwords to existing accounts. For the seeded login walkthrough, choose a fresh `EXAMPLE_DATABASE_STORAGE` path instead of deleting existing data.

Both users can read discussions and create posts. Only a post's author can update or delete it. Owning a thread does not grant permission to edit somebody else's comments. Deleting a thread also deletes its comments through the database relationship. User endpoints are read-only; account administration is outside this example.

In a second terminal:

```sh
curl -i -H "Authorization: Bearer $ALICE_TOKEN" http://localhost:3000/api/users
curl -i -H "Authorization: Bearer $ALICE_TOKEN" http://localhost:3000/api/users/1
curl -i -H "Authorization: Bearer $ALICE_TOKEN" http://localhost:3000/api/threads
curl -i -H "Authorization: Bearer $ALICE_TOKEN" http://localhost:3000/api/threads/1
curl -i -H "Authorization: Bearer $ALICE_TOKEN" http://localhost:3000/api/threads/1/comments
```

Expect HTTP 200. The fresh database contains thread 1, titled `Welcome to the board`, authored by Alice (user 1). Comment 1 belongs to Bob (user 2). Responses use explicit envelopes: `users`, `threads`, or `comments` for lists; `user`, `thread`, or `comment` for a single record. List endpoints use the inherited pagination helper; for example, `GET /api/threads?page=1&perPage=5`.

## Create a thread and comment

Start a discussion as Alice:

```sh
curl -i -H "Authorization: Bearer $ALICE_TOKEN" -H 'content-type: application/json' \
  -d '{"title":"What are you building?","body":"Share your current project."}' \
  http://localhost:3000/api/threads
```

Expect HTTP 201 with a `thread` object containing the submitted text, a generated `id`, and `authorId: 1`. On a fresh database its ID is 2; use the returned ID instead of 2 below if your database already contains other posts.

Reply as Bob:

```sh
curl -i -H "Authorization: Bearer $BOB_TOKEN" -H 'content-type: application/json' \
  -d '{"body":"I am building an Express app."}' \
  http://localhost:3000/api/threads/2/comments
```

Expect HTTP 201 with a `comment` object containing `threadId: 2` and `authorId: 2`. Its ID is 2 on a fresh database. The author always comes from the current user, and the comment's thread comes from the URL. Client-supplied `id`, `authorId`, or `threadId` fields cannot replace those values.

## Read and update posts

Read the new records:

```sh
curl -i -H "Authorization: Bearer $ALICE_TOKEN" http://localhost:3000/api/threads/2
curl -i -H "Authorization: Bearer $ALICE_TOKEN" http://localhost:3000/api/threads/2/comments/2
```

Alice can change the thread title without replacing its body:

```sh
curl -i -X PATCH -H "Authorization: Bearer $ALICE_TOKEN" -H 'content-type: application/json' \
  -d '{"title":"Show your project"}' http://localhost:3000/api/threads/2
```

Bob can update his comment:

```sh
curl -i -X PATCH -H "Authorization: Bearer $BOB_TOKEN" -H 'content-type: application/json' \
  -d '{"body":"I am using Rails-style controllers with Express."}' \
  http://localhost:3000/api/threads/2/comments/2
```

Both PATCH requests return HTTP 200 with the updated record. Omitted fields remain unchanged. Restart the app and repeat the GET requests: your records and edits remain in SQLite.

## Try the authorization boundary

Alice owns the thread but not Bob's comment. This request returns HTTP 403 with `error.code` equal to `forbidden`:

```sh
curl -i -X PATCH -H "Authorization: Bearer $ALICE_TOKEN" -H 'content-type: application/json' \
  -d '{"body":"Replace somebody else\u0027s comment"}' \
  http://localhost:3000/api/threads/2/comments/2
```

Other useful checks:

```sh
# Missing bearer token: HTTP 401, error.code = "unauthorized".
curl -i http://localhost:3000/api/threads

# Missing record: HTTP 404, error.code = "not_found".
curl -i -H "Authorization: Bearer $ALICE_TOKEN" http://localhost:3000/api/threads/999999

# Comment 1 belongs to thread 1, not thread 2: HTTP 404.
curl -i -H "Authorization: Bearer $ALICE_TOKEN" http://localhost:3000/api/threads/2/comments/1

# Blank required title: HTTP 400, error.code = "invalid_input".
curl -i -H "Authorization: Bearer $ALICE_TOKEN" -H 'content-type: application/json' \
  -d '{"title":" ","body":"A valid body"}' http://localhost:3000/api/threads
```

## Delete posts

Bob can delete his comment; Alice can delete her thread:

```sh
curl -i -X DELETE -H "Authorization: Bearer $BOB_TOKEN" http://localhost:3000/api/threads/2/comments/2
curl -i -X DELETE -H "Authorization: Bearer $ALICE_TOKEN" http://localhost:3000/api/threads/2
```

Both return HTTP 204 with no body. A subsequent GET returns 404. If a thread still has comments when its author deletes it, SQLite removes those comments too.

## Follow the application structure

| Location                                                                                | Responsibility                                                                                                                   |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [`app.ts`](app.ts)                                                                      | Compose parsing, security, API routing, frontend hosting, and error handling.                                                    |
| [`server.ts`](server.ts)                                                                | Run application initialization, then start HTTP.                                                                                 |
| [`db/db-client.ts`](db/db-client.ts)                                                    | Configure the single SQLite client without importing models.                                                                     |
| [`models/`](models/)                                                                    | Declare attributes, validation, and relationships with Sequelize decorators; register models once in `models/index.ts`.          |
| [`initializers/`](initializers/)                                                        | Ensure the database before running environment-specific seeds.                                                                   |
| [`db/seeds/`](db/seeds/)                                                                | Select ordered seed lists by environment; development owns the fresh discussion-board data.                                      |
| [`router.ts`](router.ts)                                                                | Bind Express-native resource routes.                                                                                             |
| [`controllers/`](controllers/)                                                          | Expose middleware-established currentUser and orchestrate resource reads, authorization, services, serialization, and responses. |
| [`policies/`](policies/)                                                                | Own author permissions and attribute allow-lists.                                                                                |
| [`services/threads/`](services/threads/) and [`services/comments/`](services/comments/) | Group each resource's `CreateService` and `UpdateService`, exported as `Threads` and `Comments`.                                 |
| [`serializers/`](serializers/)                                                          | Select explicit response fields instead of returning raw model objects.                                                          |

### Inherit the framework; configure the application once

The inheritance paths are `BaseController → ApplicationController → ThreadsController` and `BasePolicy → ApplicationPolicy → ThreadsPolicy`, with equivalent concrete classes for comments and users.

`ApplicationController` exposes the `currentUser` loaded by authorization middleware through `Users.LoadCurrentUserService`. Login credentials are checked by `Users.AuthenticateService`; no controller lifecycle override is needed. Request cancellation and query helpers still come from the package: actions inherit `this.signal`, `this.request.signal`, and `this.pagination`. Cancellation remains cooperative and does not automatically cancel SQL or transactions.

`ApplicationPolicy` holds common authorization behavior. Concrete policies select allowed fields and determine author permissions. Controllers use inherited `permitAttributesForCreate` and `permitAttributesForUpdate`; `BasePolicy` handles `deepPick` internally. Neither controllers nor application policies need to import that utility.

### Keep request flow visible

Routes stay normal Express resource declarations. Controllers perform ordinary model reads directly, authorize mutations, pass policy-selected attributes to services, and serialize the result. Services extend `BaseService` and use `.perform(...)`; serializers extend `BaseSerializer` and use the same call style. Model validation rejects missing or blank required text, while the API error handler translates validation failures into safe HTTP 400 responses.

Services follow WRAP's resource folders rather than repeating the resource in every filename: a threads controller imports `{ CreateService, UpdateService }` from `@example-app/services/threads/index.js`. Comments use their equivalent resource folder. Each resource's `index.ts` re-exports its concrete services; the top-level barrel also exports resource namespaces for callers using more than one resource. Serializers follow the same layout, with `ShowSerializer` in each resource folder; the inherited `.perform(...)` handles one record or an array.

Models do not call `Model.init` or import the database client. Attribute and association decorators live with the owning class; `models/index.ts` calls `db.addModels(...)` once. The example keeps its existing SQLite table/column names and omits timestamps. Schema synchronization remains local-example setup, not WRAP's production migration system.

The [seed initializer](initializers/30-run-seeds.ts) runs [`db/seeds/development/001.fill-discussion-board.ts`](db/seeds/development/001.fill-discussion-board.ts) only in development. Production and test do not run demo seeds; unknown environments are rejected rather than falling back to development. Existing databases with users are left untouched. WRAP uses its migration tooling to run seed directories; this SQLite example keeps that environment separation without adding a migration dependency.

Authorized delete actions call the model's `destroy()` method directly. The model relationship owns comment cascading; a separate service is unnecessary for that single operation.

Mutation requests accept JSON objects, URL-encoded fields, or multipart text fields. Shared API middleware rejects JSON arrays before policy filtering, so malformed attribute shapes return a client error rather than an internal failure.

The list queries use fixed ordering and bounded pagination, not unrestricted client-supplied Sequelize conditions. Error handling stays Express-native: public `BaseApiError` failures preserve their status and body, while unexpected errors return a generic 500 without internal details.

## Check your changes

From the repository root:

```sh
npm run test -- --run tests/example-app/app.test.ts
npm run check-types
npm run lint
```

The tests arrange users, threads, and comments with [Factory Shark factories](../tests/example-app/factories/), using real Sequelize records. Each test owns its data; the application's startup seeds are not shared test fixtures. See [the testing guide](../tests/README.md#discussion-board-factories) for factory usage and the pinned development ORM/dialect versions. Factory Shark is test tooling, not an application runtime requirement.

The application tests use an isolated in-memory SQLite database, not the example's persistent file. For the framework's individual conventions, see the [controller](../src/base-controller/README.md), [policy](../src/base-policy/README.md), [service](../src/base-service/README.md), and [serializer](../src/base-serializer/README.md) guides. Jobs and channels are separate examples in the [jobs](../docs/jobs.md) and [channels](../docs/channels.md) guides. Existing applications should follow the [incremental adoption guide](../docs/adoption.md) rather than replacing their persistence or authentication with this demo.
