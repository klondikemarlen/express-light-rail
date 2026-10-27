# Optional Socket.IO channels

`express-light-rail/channels/socket-io` provides `BaseChannel`, `ChannelManager`, and a typed, process-local `PubSub`. Use one authenticated application namespace to carry labeled packets for multiple resource kinds. A channel represents a connection's authenticated context, not a model superclass or a requirement to create one class per model.

Socket.IO `>=4.8.4 <5` is an explicit optional transport. Ordinary `express-light-rail` imports do not load Socket.IO, attach an HTTP listener, or start a connection. Hosts retain users, authentication, resource policies, event catalogs, serialization, persistence, Express routing, and deployment.

```sh
npm install express-light-rail socket.io@^4.8.4
```

## One application channel, multiple resource kinds

Keep a host-owned packet catalog shared between the server and client. Its keys describe application events; its values are serialized wire payloads, not ORM instances. For example:

```ts
export type ApplicationPackets = {
  "tasks:updated": { id: string; title: string }
  "notifications:created": { id: string; body: string }
}
```

`ChannelPacket<ApplicationPackets>` is a discriminated union: a `tasks:updated` packet requires the task payload, while a `notifications:created` packet requires the notification payload. Both travel through the same Socket.IO `packet` event as one `{ type, payload }` argument. Labels are host-owned strings: these examples use colons, but the package does not validate or rewrite label punctuation.

Rails Action Cable is an organizational analogy, not this package's transport or subscription protocol. The [Rails Action Cable guide](https://guides.rubyonrails.org/action_cable_overview.html#server-side-components) describes connection authentication in `ApplicationCable::Connection`, shared channel behavior in the parent `ApplicationCable::Channel`, and concrete channels that own subscriptions. Here `ChannelManager.authenticate` authenticates the Socket.IO connection; a host `ApplicationChannel` holds shared connection-level helpers; and a concrete `UpdatesChannel` owns its process-local event subscriptions. Unlike Action Cable consumers, a socket in this example receives multiple resource kinds through one `/updates` namespace and one channel instance. The Rails guide does not prescribe event-label punctuation.

The following server example uses ordinary records to make ownership visible. The host retains resource policies and DTO serialization; the identity checks shown here are only a small demonstration of per-event authorization.

```ts
import { createServer } from "node:http"
import express from "express"
import { BaseChannel, ChannelManager, PubSub } from "express-light-rail/channels/socket-io"

// Share this catalog with the frontend through the host's own contracts module.
type ApplicationPackets = {
  "tasks:updated": { id: string; title: string }
  "notifications:created": { id: string; body: string }
}
type User = { id: string }
type Task = { id: string; title: string; ownerId: string }
type Notification = { id: string; body: string; recipientId: string }
type DomainEvents = {
  "tasks:updated": [task: Task]
  "notifications:created": [notification: Notification]
}

const updates = new PubSub<DomainEvents>()
const users = new Map<string, User>([
  ["alice", { id: "alice" }],
  ["bob", { id: "bob" }],
])

class ApplicationChannel extends BaseChannel<User, ApplicationPackets> {
  protected isCurrentUser(userId: string): boolean {
    return this.currentUser.id === userId
  }
}

class UpdatesChannel extends ApplicationChannel {
  subscribed(): void {
    updates.subscribe("tasks:updated", this.taskUpdated, this.invalidate)
    updates.subscribe("notifications:created", this.notificationCreated, this.invalidate)
    super.subscribed()
  }

  unsubscribed(): void {
    updates.unsubscribe("tasks:updated", this.taskUpdated)
    updates.unsubscribe("notifications:created", this.notificationCreated)
    super.unsubscribed()
  }

  private readonly taskUpdated = (task: Task): void => {
    if (!this.isCurrentUser(task.ownerId)) return

    const payload = { id: task.id, title: task.title }
    this.broadcast("tasks:updated", payload)
  }

  private readonly notificationCreated = (notification: Notification): void => {
    if (!this.isCurrentUser(notification.recipientId)) return

    const payload = { id: notification.id, body: notification.body }
    this.broadcast("notifications:created", payload)
  }
}

const application = express()
const server = createServer(application)
const channels = new ChannelManager(server, {
  channels: { "/updates": UpdatesChannel },
  authenticate(socket) {
    // Demonstration lookup only: production hosts verify their own credentials.
    const identifier: unknown = socket.handshake.auth.userId
    if (typeof identifier !== "string") throw new Error("Authentication required")

    const user = users.get(identifier)
    if (!user) throw new Error("Unknown user")

    return user
  },
})
server.listen(3000)
```

`ApplicationChannel` contains only connection-wide shared behavior; resource event subscriptions stay in the concrete `UpdatesChannel`. In production, replace the simple identity comparisons with the host's resource policies and keep the host's serializers responsible for packet DTOs. A resource model does not need its own channel class or namespace. Separate namespaces remain available for genuinely separate connection requirements.

The manager attaches a native Socket.IO server but never calls `listen()`. Authentication is required before channel construction, and its returned user becomes that channel's typed `currentUser`. Rejected or nullish authentication does not start a channel. Clients receive a generic authentication error; the original error is available through the server logger and optional `onError(error, socket)` hook. Authentication and packet labels are not resource authorization.

## Browser-safe packet handling

Import `ChannelPacket` and `ChannelServerEvents` directly from `express-light-rail/contracts`. They are transport-free types: importing them does not load Socket.IO, Express, Sequelize, Winston, or Node modules. The Socket.IO entrypoint also re-exports these types for backend convenience.

With the shared `ApplicationPackets` catalog and host UI functions `updateTask` and `addNotification`, a native Socket.IO client can use one data listener:

```ts
import { io, type Socket } from "socket.io-client"
import type { ChannelServerEvents } from "express-light-rail/contracts"

const socket: Socket<ChannelServerEvents<ApplicationPackets>> = io(
  "http://localhost:3000/updates",
  { auth: { userId: "alice" } }
)

socket.on("packet", (packet) => {
  switch (packet.type) {
    case "tasks:updated":
      updateTask(packet.payload)
      break
    case "notifications:created":
      addNotification(packet.payload)
      break
  }
})
```

`packet.type` narrows `packet.payload` without a cast. A mismatched label/payload pair is a type error even if both individual values belong to the catalog. TypeScript contracts are not runtime validation of arbitrary network input; hosts own validation for untrusted data and any separately registered inbound socket commands. This package does not dispatch inbound commands from packet labels.

Native lifecycle controls remain separate, payload-free events: `subscribed`, `unsubscribed`, and `invalidated`. Call `super.subscribed()` after installing listeners to signal readiness. `invalidated` indicates the client should refresh authoritative application state; it does not report successful delivery of a particular model update.

## Delivery and subscription ownership

`broadcast(label, payload)` constructs and sends `{ type: label, payload }` through the `packet` event only to that channel's connected socket, not the namespace, another user, or a global room. The bound `invalidate` callback also emits only while connected. `channels.server` exposes the native Socket.IO server for host composition; broader broadcast/room APIs require the host's own targeting and authorization rules.

Create process-local buses in the host and retain original listener identities for teardown. `PubSub` keeps its tuple-based `publish(event, ...payload)` API for internal domain events; it does not impose the wire packet's DTO shape on host records. Publishing dispatches synchronously and does not await asynchronous listeners or promise ordered asynchronous completion, persistence, or cross-process delivery.

`subscribe(event, listener, onError?)` returns an `AbortSignal` for that registration. `unsubscribe(event, listener)` removes the newest matching registration, aborts its signal synchronously, and leaves earlier duplicate registrations intact. Removing an absent registration is harmless. Cancellation suppresses future dispatch and pending error recovery. Listener throws, rejected listener promises, and recovery-hook failures are contained and logged; one failing listener does not prevent other listeners from receiving an event.

Already-running JavaScript and domain I/O cannot be forcibly cancelled. Pass the returned signal into cancellable I/O, or check it after an `await` before broadcasting. Recheck host policy against freshly loaded state too. For example, an asynchronous task handler in the concrete channel can retain its subscription signal:

```ts
private subscription?: AbortSignal

subscribed(): void {
  this.subscription = updates.subscribe("tasks:updated", this.taskUpdated, this.invalidate)
  super.subscribed()
}

unsubscribed(): void {
  updates.unsubscribe("tasks:updated", this.taskUpdated)
  super.unsubscribed()
}

private readonly taskUpdated = async (task: Task): Promise<void> => {
  const visible = await canReadCurrentTask(this.currentUser, task)
  if (this.subscription?.aborted || !visible) return

  const payload = { id: task.id, title: task.title }
  this.broadcast("tasks:updated", payload)
}
```

Here `canReadCurrentTask` is a host-owned policy operation. Unsubscribe with the original callback, not a new arrow function. Failed initialization also runs `unsubscribed()`, so teardown must tolerate partially installed subscriptions. Transactions and request-local async context stay host-owned: a callback deferred until commit must not reuse that transaction for later queries.

## Reconnection and shutdown

Treat packets as live notifications, not a durable source of truth or an exactly-once delivery mechanism. Clients should refresh authoritative HTTP state after reconnection or invalidation; the package does not add persistence, replay cursors, retry queues, or cross-process fanout. Use the host's normal Socket.IO adapter and broker topology when multiple processes need to publish.

Connection-state recovery requires fresh authentication before recreating the channel. With `serverOptions.connectionStateRecovery`, the manager forces `skipMiddlewares: false`, overriding Socket.IO's default or a supplied `true`; other recovery settings remain host-owned. Native replay does not rerun a host's outgoing resource policy. Enable it only when the host's session identity and replay-authorization requirements are satisfied; otherwise leave it disabled and refresh application state instead.

The manager installs disconnect tracking before asynchronous initialization. On failure or disconnect, it waits for initialization to settle and invokes teardown once, including registrations installed late by a slow initializer. Initialization failure disconnects only its namespace, preserving other namespaces on a shared transport. Cleanup and reporting-hook errors are contained without retaining the connection.

```ts
await channels.close()
```

`close()` is idempotent, stops channel connections, waits for initialization and teardown, then closes the native Socket.IO server **and the attached HTTP server**. Stop host producers first; this is whole-server shutdown, not detaching channels while HTTP keeps running. Hooks must eventually settle. Keep timeout/cancellation policy and process signal handling in the host.

## Upgrade from the raw-event API

The packet API changes the application-data wire contract, but producer migration depends on the version being adopted:

- With 0.7 two-argument producers, keep the call shape `broadcast(label, payload)`. Supply the host catalog as the second generic (`BaseChannel<User, ApplicationPackets>`), and align the labels and serialized payloads with that catalog. Change clients from resource-specific Socket.IO event listeners to `socket.on("packet", ...)`, dispatching on `packet.type`.
- With 0.8 object-form producers, replace `broadcast({ type: label, payload })` with `broadcast(label, payload)`. The receive-side wire is already `packet` carrying `{ type, payload }`, so clients do not change solely for this producer API change.
- In either case, map the application class to `/updates` or the host's selected namespace. Audit HTTP path, namespace, origin/CORS, handshake credentials, native lifecycle signals and recovery settings separately.

For WRAP, the [inspected source revision](https://github.com/icefoganalytics/wrap/tree/4e170b491a72ba011c045f073021cd8475748585/api/src/channels) distinguishes internal bus events from raw socket event names. Map those explicitly to host packet labels:

| Internal event              | Old raw socket event | Example host packet label    |
| --------------------------- | -------------------- | ---------------------------- |
| `notifications:create`      | `created`            | `notifications:created`      |
| `notifications:update`      | `updated`            | `notifications:updated`      |
| `notifications:bulk_update` | `bulk_updated`       | `notifications:bulk_updated` |

The packet labels are host choices: retain or rename them deliberately in the host catalog, preserving each event's host-owned DTO and policy. The package does not translate WRAP events or labels.

The two-argument producer sends only the `packet` event; it does not also emit an event named after the label. Coordinate any server/client wire cutover and rollback; changing a package version does not migrate a host automatically. Jobs and internal `PubSub` tuples do not change.

## Runnable example and consumer verification

The [Socket.IO consumer](https://github.com/klondikemarlen/express-light-rail/tree/main/tests/fixtures/channels/socket-io) includes an ordinary Express/HTTP example with one application channel, two resource packet kinds, and host-owned policies. Authentication identifiers are demonstration data, not production credentials. It exercises actual independent clients, typed ESM/CommonJS consumers, targeting, callback cancellation, failure recovery and lifecycle cleanup.

```sh
npm run build
npm pack
bash tests/fixtures/channels/socket-io/smoke.sh /absolute/path/to/express-light-rail-VERSION.tgz
```

For release proof, fetch the exact published tarball with `npm pack express-light-rail@VERSION` and pass it to the same command. A local candidate is not proof of publication or host adoption. The two [browser contract consumers](browser-contracts.md) separately exercise host-owned packet catalogs without importing the transport. Support is bounded by the documented runtime/transport/compiler ranges and observed consumer checks, not a claim that every existing host has already adopted this protocol.
