# Example application

Run a small Express application and follow a task from its route through authorization, a service, and a serializer. The example uses the package's `BaseController`, `BaseService`, `BaseSerializer`, and API error handlers. Its task data lives in memory, so you can explore the request flow without setting up a database.

## Run the app

Clone this repository, then run these commands from the repository root, not from `example-app/`:

```sh
git clone https://github.com/klondikemarlen/express-light-rail.git
cd express-light-rail
npm install
npm run build
npm run example
```

Use the Node.js version in the repository's [`.tool-versions`](../.tool-versions); with asdf installed, `asdf install nodejs` installs that version. Building first makes the local package available to the example's `express-light-rail` imports.

The server listens at `http://localhost:3000`. To choose another port, run `API_PORT=3352 npm run example` and adjust the URLs below. Stop with Ctrl-C. The command compiles TypeScript before starting the server; restart it after changing application code. Each restart resets the task data.

No database, Redis server, environment file, or external account is needed. The `x-user-id` header selects a demo user; it is not production authentication.

## Try a request

In a second terminal, list Alice's open tasks:

```sh
curl -i -H 'x-user-id: alice' 'http://localhost:3000/api/tasks?status=open'
```

The response is HTTP 200 with this body on a fresh server:

```json
{
  "tasks": [{ "id": 1, "title": "Review access", "status": "open", "visibility": "private" }]
}
```

Alice can see public tasks and her own private tasks. The `status=open` filter narrows that visible set; it never grants access to Bob's private tasks. The serializer omits `ownerId` from responses.

Now create a task as Alice:

```sh
curl -i -H 'x-user-id: alice' -H 'content-type: application/json' \
  -d '{"title":"Plan the next release","status":"open","visibility":"private"}' \
  http://localhost:3000/api/tasks
```

Expect HTTP 201 and a `task` object with the submitted fields and a generated `id` (4 on a fresh server). The service sets ownership from the authenticated actor, not from request input. Repeat the list request to see the new task.

Bob can list tasks but cannot create them:

```sh
curl -i -H 'x-user-id: bob' -H 'content-type: application/json' \
  -d '{"title":"Not allowed"}' http://localhost:3000/api/tasks
```

Expect HTTP 403:

```json
{ "error": { "code": "forbidden", "msg": "You cannot create tasks", "meta": {} } }
```

## Follow the code

| File                                               | Responsibility                                                                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [`server.ts`](server.ts)                           | Start the HTTP listener.                                                                                         |
| [`app.ts`](app.ts)                                 | Compose JSON parsing, the API router, API-not-found handling, and error handling.                                |
| [`router.ts`](router.ts)                           | Establish the demo user, define the application controller and task actions, and connect them to Express routes. |
| [`tasks-policy.ts`](tasks-policy.ts)               | Decide task visibility and creation permission; select and validate creation attributes.                         |
| [`create-task-service.ts`](create-task-service.ts) | Create a task with server-assigned identity and ownership.                                                       |
| [`task-serializer.ts`](task-serializer.ts)         | Select the fields returned to clients.                                                                           |
| [`domain.ts`](domain.ts)                           | Define the user/task types and initial in-memory records.                                                        |

### Inherit framework behavior

The host's `ApplicationController` extends the package's `BaseController`. `TasksController` extends that application base. The only shared application-specific accessor here is the user:

```ts
abstract class ApplicationController extends BaseController<never, AuthenticatedRequest> {
  protected get currentUser(): User {
    return this.request.currentUser
  }
}
```

The package supplies Express action dispatch and request cancellation. Actions inherit `this.signal` and `this.request.signal` without copying signal setup into the application base. Cancellation is cooperative: services must use a passed signal to stop work; the framework does not automatically cancel their operations.

Query helpers such as `this.buildWhere()`, `this.buildFilterScopes()`, `this.buildOrder()`, and `this.pagination` are also inherited. This in-memory example filters arrays directly rather than constructing Sequelize queries. See the [controller guide](../src/base-controller/README.md) when adding model-backed actions. Standalone helper imports remain available for code outside controllers.

### Keep actions focused on orchestration

The create action checks permission before selecting input, then calls the service and serializer:

```ts
const attributes = policy.permitCreate(this.request.body)
const task = CreateTaskService.perform(user, attributes)
const serializedTask = TaskSerializer.perform(task)
this.response.status(201).json({ task: serializedTask })
```

The surrounding action in [`router.ts`](router.ts) obtains `user` and `policy` and rejects callers whose policy denies creation. `CreateTaskService` extends `BaseService<Task>`; `TaskSerializer` extends `BaseSerializer<Task, TaskJson>`. Their callers use `.perform(...)` instead of constructing these objects themselves.

The current `TasksPolicy` is a host-owned, in-memory policy, not a subclass of the package's Sequelize-backed `BasePolicy`. It accepts a non-empty title, normalizes status and visibility, and excludes fields such as `ownerId`. For model-backed policies, the [policy guide](../src/base-policy/README.md) describes inherited permitted-attribute filtering: concrete policies declare an allow-list, while `BasePolicy` calls `deepPick` internally. Ordinary controllers do not need to import `deepPick`.

### Leave routing and errors Express-native

The router binds resource actions directly:

```ts
router.get("/tasks", TasksController.index)
router.post("/tasks", TasksController.create)
```

[`app.ts`](app.ts) mounts this router at `/api`. Controller action failures pass to Express error middleware. Expected `BaseApiError` failures preserve their public status and structured body; unexpected failures return a generic error rather than exposing internal messages.

## Explore error responses

Run these against the same server:

```sh
# Missing demo identity: HTTP 401, error.code = "unauthorized".
curl -i http://localhost:3000/api/tasks

# Missing required title: HTTP 400, error.code = "invalid_input".
curl -i -H 'x-user-id: alice' -H 'content-type: application/json' \
  -d '{}' http://localhost:3000/api/tasks

# Deliberate action failure: HTTP 500, error.code = "internal_server_error".
curl -i -H 'x-user-id: alice' 'http://localhost:3000/api/tasks?fail=true'
```

The failure switch is a demonstration of error handling, not an application feature to carry into production.

## Check your changes

From the repository root, run the existing application behavior tests and package type checks:

```sh
npm run test -- --run tests/example-app/app.test.ts
npm run check-types
```

The app is a runnable guide, not a production deployment template. Authentication and persistence remain application responsibilities. Jobs and channels are separate opt-in mechanisms; see the [jobs guide](../docs/jobs.md) and [channels guide](../docs/channels.md). For replacing an existing application's bases rather than starting with this example, use the [incremental adoption guide](../docs/adoption.md).
