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

SQLite stores data in `.example-app/discussion-board.sqlite`, which is ignored by Git. Startup creates the schema and seeds a fresh database with Alice, Bob, one welcome thread, and Bob's comment. Restarting does not reset existing records. To explore a separate empty database, choose a new path:

```sh
EXAMPLE_DATABASE_STORAGE=/tmp/my-discussion-board.sqlite npm run example
```

No Redis, external account, environment file, or database container is required. Schema synchronization is convenient for this local example; production applications should own migrations, backups, configuration, and deployment.

## Meet the users and models

| Model   | Fields                               | Relationship                         |
| ------- | ------------------------------------ | ------------------------------------ |
| User    | `id`, `username`, `name`             | Authors threads and comments.        |
| Thread  | `id`, `title`, `body`, `authorId`    | Belongs to an author; has comments.  |
| Comment | `id`, `body`, `threadId`, `authorId` | Belongs to one thread and an author. |

The `x-user-id` header selects the seeded username `alice` or `bob`. This is deliberately simple **demo identity selection**, not secure authentication. A real application establishes the current user through its authentication middleware instead.

Both users can read discussions and create posts. Only a post's author can update or delete it. Owning a thread does not grant permission to edit somebody else's comments. Deleting a thread also deletes its comments through the database relationship. User endpoints are read-only; account administration is outside this example.

In a second terminal:

```sh
curl -i -H 'x-user-id: alice' http://localhost:3000/api/users
curl -i -H 'x-user-id: alice' http://localhost:3000/api/users/1
curl -i -H 'x-user-id: alice' http://localhost:3000/api/threads
curl -i -H 'x-user-id: alice' http://localhost:3000/api/threads/1
curl -i -H 'x-user-id: alice' http://localhost:3000/api/threads/1/comments
```

Expect HTTP 200. The fresh database contains thread 1, titled `Welcome to the board`, authored by Alice (user 1). Comment 1 belongs to Bob (user 2). Responses use explicit envelopes: `users`, `threads`, or `comments` for lists; `user`, `thread`, or `comment` for a single record. List endpoints use the inherited pagination helper; for example, `GET /api/threads?page=1&perPage=5`.

## Create a thread and comment

Start a discussion as Alice:

```sh
curl -i -H 'x-user-id: alice' -H 'content-type: application/json' \
  -d '{"title":"What are you building?","body":"Share your current project."}' \
  http://localhost:3000/api/threads
```

Expect HTTP 201 with a `thread` object containing the submitted text, a generated `id`, and `authorId: 1`. On a fresh database its ID is 2; use the returned ID instead of 2 below if your database already contains other posts.

Reply as Bob:

```sh
curl -i -H 'x-user-id: bob' -H 'content-type: application/json' \
  -d '{"body":"I am building an Express app."}' \
  http://localhost:3000/api/threads/2/comments
```

Expect HTTP 201 with a `comment` object containing `threadId: 2` and `authorId: 2`. Its ID is 2 on a fresh database. The author always comes from the current user, and the comment's thread comes from the URL. Client-supplied `id`, `authorId`, or `threadId` fields cannot replace those values.

## Read and update posts

Read the new records:

```sh
curl -i -H 'x-user-id: alice' http://localhost:3000/api/threads/2
curl -i -H 'x-user-id: alice' http://localhost:3000/api/threads/2/comments/2
```

Alice can change the thread title without replacing its body:

```sh
curl -i -X PATCH -H 'x-user-id: alice' -H 'content-type: application/json' \
  -d '{"title":"Show your project"}' http://localhost:3000/api/threads/2
```

Bob can update his comment:

```sh
curl -i -X PATCH -H 'x-user-id: bob' -H 'content-type: application/json' \
  -d '{"body":"I am using Rails-style controllers with Express."}' \
  http://localhost:3000/api/threads/2/comments/2
```

Both PATCH requests return HTTP 200 with the updated record. Omitted fields remain unchanged. Restart the app and repeat the GET requests: your records and edits remain in SQLite.

## Try the authorization boundary

Alice owns the thread but not Bob's comment. This request returns HTTP 403 with `error.code` equal to `forbidden`:

```sh
curl -i -X PATCH -H 'x-user-id: alice' -H 'content-type: application/json' \
  -d '{"body":"Replace somebody else\u0027s comment"}' \
  http://localhost:3000/api/threads/2/comments/2
```

Other useful checks:

```sh
# Missing demo identity: HTTP 401, error.code = "unauthorized".
curl -i http://localhost:3000/api/threads

# Missing record: HTTP 404, error.code = "not_found".
curl -i -H 'x-user-id: alice' http://localhost:3000/api/threads/999999

# Comment 1 belongs to thread 1, not thread 2: HTTP 404.
curl -i -H 'x-user-id: alice' http://localhost:3000/api/threads/2/comments/1

# Blank required title: HTTP 400, error.code = "invalid_input".
curl -i -H 'x-user-id: alice' -H 'content-type: application/json' \
  -d '{"title":" ","body":"A valid body"}' http://localhost:3000/api/threads
```

## Delete posts

Bob can delete his comment; Alice can delete her thread:

```sh
curl -i -X DELETE -H 'x-user-id: bob' http://localhost:3000/api/threads/2/comments/2
curl -i -X DELETE -H 'x-user-id: alice' http://localhost:3000/api/threads/2
```

Both return HTTP 204 with no body. A subsequent GET returns 404. If a thread still has comments when its author deletes it, SQLite removes those comments too.

## Follow the application structure

| Location                                              | Responsibility                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`app.ts`](app.ts)                                    | Compose JSON parsing, API routing, not-found handling, and error handling in separate groups. |
| [`server.ts`](server.ts)                              | Initialize and seed the database, then start HTTP.                                            |
| [`database.ts`](database.ts) and [`models/`](models/) | Configure SQLite and define real Sequelize models and relationships.                          |
| [`seed.ts`](seed.ts)                                  | Seed only a fresh database; preserve existing data on restart.                                |
| [`router.ts`](router.ts)                              | Resolve the demo current user and bind Express-native resource routes.                        |
| [`controllers/`](controllers/)                        | Orchestrate reads, authorization, services, serialization, and HTTP responses.                |
| [`policies/`](policies/)                              | Own author permissions and attribute allow-lists.                                             |
| [`services/`](services/)                              | Own thread/comment mutations and their validated inputs.                                      |
| [`serializers/`](serializers/)                        | Select explicit response fields instead of returning raw model objects.                       |

### Inherit the framework; configure the application once

The inheritance paths are `BaseController → ApplicationController → ThreadsController` and `BasePolicy → ApplicationPolicy → ThreadPolicy`, with equivalent concrete classes for comments.

`ApplicationController` exposes the project's `currentUser`. Request cancellation and query helpers already come from the package: actions inherit `this.signal`, `this.request.signal`, and `this.pagination`. There is no copied signal setup in each controller. Cancellation remains cooperative; it does not automatically cancel SQL or transactions.

`ApplicationPolicy` holds common authorization behavior. Concrete policies select allowed fields and determine author permissions. Controllers use inherited `permitAttributesForCreate` and `permitAttributesForUpdate`; `BasePolicy` handles `deepPick` internally. Neither controllers nor application policies need to import that utility.

### Keep request flow visible

Routes stay normal Express resource declarations. Controllers perform ordinary model reads directly, authorize mutations, pass policy-selected attributes to services, and serialize the result. Services extend `BaseService` and use `.perform(...)`; serializers extend `BaseSerializer` and use the same call style. Model validation rejects missing or blank required text, while the API error handler translates validation failures into safe HTTP 400 responses.

The list queries use fixed ordering and bounded pagination, not unrestricted client-supplied Sequelize conditions. Error handling stays Express-native: public `BaseApiError` failures preserve their status and body, while unexpected errors return a generic 500 without internal details.

## Check your changes

From the repository root:

```sh
npm run test -- --run tests/example-app/app.test.ts
npm run check-types
npm run lint
```

The application tests use an isolated in-memory SQLite database, not the example's persistent file. For the framework's individual conventions, see the [controller](../src/base-controller/README.md), [policy](../src/base-policy/README.md), [service](../src/base-service/README.md), and [serializer](../src/base-serializer/README.md) guides. Jobs and channels are separate examples in the [jobs](../docs/jobs.md) and [channels](../docs/channels.md) guides. Existing applications should follow the [incremental adoption guide](../docs/adoption.md) rather than replacing their persistence or authentication with this demo.
