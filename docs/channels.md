# Optional Socket.IO channels

`express-light-rail/channels/socket-io` provides `BaseChannel`, `ChannelManager`, and a typed, process-local `PubSub`. It supports Socket.IO `>=4.8.4 <5`; install the transport explicitly. Ordinary `express-light-rail` imports do not load Socket.IO, attach an HTTP listener, or start a connection. Host applications retain Express routing, users, authentication, authorization, event schemas, persistence, and deployment.

```sh
npm install express-light-rail socket.io@^4.8.4
```

## Attach to ordinary HTTP

For host-owned `User`, `RecordPayload`, `users`, and `canRead` definitions:

```ts
import { createServer } from "node:http"
import express from "express"
import { BaseChannel, ChannelManager, PubSub } from "express-light-rail/channels/socket-io"

const updates = new PubSub<{ changed: [record: RecordPayload] }>()

class RecordsChannel extends BaseChannel<User> {
  subscribed(): void {
    updates.subscribe("changed", this.changed, this.invalidate)
  }

  unsubscribed(): void {
    updates.unsubscribe("changed", this.changed)
  }

  private readonly changed = (record: RecordPayload): void => {
    if (!canRead(this.currentUser, record)) return

    this.broadcast("changed", record)
  }
}

const application = express()
const server = createServer(application)
const channels = new ChannelManager(server, {
  channels: {
    "/records": RecordsChannel,
  },
  authenticate(socket) {
    // Example lookup only: production hosts verify their own credentials here.
    const identifier: unknown = socket.handshake.auth.userId
    if (typeof identifier !== "string") throw new Error("Authentication required")

    const user = users.get(identifier)
    if (!user) throw new Error("Unknown user")

    return user
  },
})
server.listen(3000)
```

The manager attaches a native Socket.IO server but never calls `listen()`. Authentication is required for each mapped namespace before channel construction, and its returned user becomes that channel's typed `currentUser`. Rejected or nullish authentication does not start the channel. Client authentication failures have a generic message; the original error is available through the server logger and optional `onError(error, socket)` hook. Authorize subscriptions and each outgoing record in host policies; authentication alone is not resource authorization.

Connection-state recovery also requires fresh authentication before a channel is recreated. When `serverOptions.connectionStateRecovery` is enabled, the manager forces `skipMiddlewares: false`, overriding Socket.IO's default or a supplied `true`. Other recovery settings remain host-owned.

`broadcast(event, ...payload)` sends only to the channel's connected socket, not its namespace, another user, or a global room. The bound `invalidate` callback sends a payload-free `invalidated` event only while connected. `channels.server` exposes the native Socket.IO server for host options and native composition; using its broader broadcast APIs requires the host's own targeting/authorization rules.

## Subscription and cancellation ownership

Create the process-local bus in the host and keep each original listener identity for teardown. Event names and argument tuples belong to that host, not a package-owned event catalog. `publish(event, ...payload)` dispatches synchronously; it does not await asynchronous listeners or promise ordered completion, persistence, or cross-process delivery.

`subscribe(event, listener, onError?)` returns an `AbortSignal` for that registration. `unsubscribe(event, listener)` removes the most recent matching registration, aborts its signal synchronously, and leaves earlier duplicate registrations intact. Removing an absent registration is harmless. Future dispatch and pending error recovery are suppressed for cancelled registrations. Synchronous listener throws, rejected listener promises, and recovery-hook failures are contained and logged through the package's Winston logger; one failing listener does not prevent other listeners from receiving the event.

Already-running JavaScript and domain I/O cannot be forcibly cancelled. Pass the returned signal into cancellable I/O, or check it after an `await` before broadcasting. Recheck host authorization against any freshly loaded state too. For example, inside a channel's `subscribed()` hook:

```ts
private subscription?: AbortSignal

subscribed(): void {
  this.subscription = updates.subscribe("changed", this.changed, this.invalidate)
}

unsubscribed(): void {
  updates.unsubscribe("changed", this.changed)
}

private readonly changed = async (record: RecordPayload): Promise<void> => {
  const visible = await canReadCurrentRecord(this.currentUser, record)
  if (this.subscription?.aborted || !visible) return

  this.broadcast("changed", record)
}
```

Retain that listener identity and unsubscribe it in `unsubscribed()`; a new arrow function is not the same registration. A failed initialization also runs `unsubscribed()`, so teardown must tolerate partially initialized subscriptions. Database transactions and request-local async context are host concerns; a callback deferred from a committed transaction must not reuse that transaction for later queries.

## Lifecycle and shutdown

Register listeners in `subscribed()`, not constructors, and remove them in `unsubscribed()`. The manager installs disconnect tracking before invoking asynchronous initialization. On failure or disconnect it waits for initialization to settle, then invokes teardown once. A late registration from a slow initializer is therefore still removed. Initialization failure disconnects only its namespace, preserving other channels on a shared transport. Cleanup errors are reported without retaining the connection in the manager; errors from the reporting hook are logged and contained too.

```ts
await channels.close()
```

`close()` is idempotent, stops channel connections, and waits for pending initialization and teardown. It then closes the native Socket.IO server **and the attached HTTP server**. Stop host producers first; this is whole-server shutdown, not a way to detach channels while leaving HTTP running. Hooks must eventually settle: the package cannot terminate a host's never-resolving promise. Keep timeout/cancellation policy and process signal handling in the host.

## Incremental adoption and wire compatibility

Adopt one namespace at a time, retaining ordinary Express routes and host policies. Replace only the copied channel manager/base and guarded pub/sub mechanism. This extraction is grounded in WRAP's socket-local broadcasts, per-user policy checks, lifecycle hooks, and newest-first duplicate removal; it does not ship WRAP's user model, Auth0/JWT middleware, notification/workflow event catalog, or database hooks.

This is not a drop-in WRAP client migration. Audit Socket.IO versions, HTTP path, namespace, origin/CORS settings, handshake credentials, event names, payloads, and recovery behavior against the host's actual client. Configure transport options through `serverOptions`. Existing clients expecting WRAP's host-specific authentication or events require an explicit coordinated cutover and rollback plan; no host is automatically upgraded.

## Runnable example and consumer verification

The repository's [Socket.IO consumer](https://github.com/klondikemarlen/express-light-rail/tree/main/tests/fixtures/channels/socket-io) includes an ordinary Express/HTTP example with one host-owned channel and policy. Its `npm run example` entrypoint uses the installed package; authentication identifiers in the example are demonstration data, not production credentials.

From the repository, build and pack a candidate, then run:

```sh
npm run build
npm pack
bash tests/fixtures/channels/socket-io/smoke.sh /absolute/path/to/express-light-rail-VERSION.tgz
```

The isolated consumer exercises real Socket.IO clients, authorization/targeting, failure recovery, cancellation and disconnect cleanup, strict declarations, and plain Node module imports. For release proof, fetch the exact registry artifact with `npm pack express-light-rail@VERSION` and pass that tarball to the same command. A local candidate is not proof of registry publication or host adoption.
