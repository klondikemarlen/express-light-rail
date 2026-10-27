import { createServer, type Server as HttpServer } from "node:http"

import express from "express"
import { afterEach, describe, expect, test } from "vitest"
import { Manager, type Socket as ClientSocket } from "socket.io-client"
import type { Socket as ServerSocket } from "socket.io"

import {
  BaseChannel,
  ChannelManager,
  PubSub,
  type ChannelManagerOptions,
  type ChannelPacket,
  type ChannelServerEvents,
} from "express-light-rail/channels/socket-io"

type User = { id: string }
type HostPackets = {
  "authenticated.user": { userId: string }
  "records:updated": { recordId: string }
  "projects:updated": { projectId: string }
  "other.changed": { recordId: string }
  "late.success": { message: string }
}
type ClientCommands = {
  barrier: (acknowledge: (ready: boolean) => void) => void
  "cancel-work": (acknowledge: (aborted: boolean) => void) => void
}
type TypedClientSocket = ClientSocket<ChannelServerEvents<HostPackets>, ClientCommands>
type HostEvents = {
  "records:updated": [recordId: string, ownerId: string]
  "other.changed": [recordId: string]
  "projects:updated": [projectId: string, ownerId: string]
  "sync.failure": []
  "async.failure": []
  "success.after.cancel": []
  "failure.after.cancel": []
}

type Host = {
  manager: ChannelManager<User>
  url: string
}

const cleanups: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

function deferred() {
  const { promise, resolve } = Promise.withResolvers<void>()
  return { promise, resolve }
}

async function startHost(options: ChannelManagerOptions<User>): Promise<Host> {
  const app = express()
  const httpServer: HttpServer = createServer(app)
  const manager = new ChannelManager<User>(httpServer, options)

  const { promise, resolve, reject } = Promise.withResolvers<void>()
  httpServer.once("error", reject)
  httpServer.listen(0, resolve)
  await promise
  const address = httpServer.address()
  if (address === null || typeof address === "string") {
    await manager.close()
    throw new Error("The test HTTP server did not bind to a TCP port")
  }

  cleanups.push(async () => manager.close())
  return { manager, url: `http://127.0.0.1:${address.port}` }
}

function openTransport(url: string): Manager {
  const manager = new Manager(url, {
    autoConnect: false,
    reconnection: false,
    timeout: 5_000,
  })
  cleanups.push(async () => {
    manager.engine?.close()
  })
  return manager
}

function connectSocket(socket: TypedClientSocket): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>()
  socket.once("connect", resolve)
  socket.once("connect_error", reject)
  socket.connect()
  return promise
}

function waitForEvent(
  socket: TypedClientSocket,
  event: keyof ChannelServerEvents<HostPackets> | "connect_error" | "disconnect"
): Promise<unknown[]> {
  const { promise, resolve } = Promise.withResolvers<unknown[]>()
  socket.once(event, (...payload: unknown[]) => resolve(payload))
  return promise
}

function acknowledge(socket: TypedClientSocket, event: keyof ClientCommands): Promise<unknown> {
  const { promise, resolve } = Promise.withResolvers<unknown>()
  socket.emit(event, resolve)
  return promise
}

function authenticate(socket: Parameters<ChannelManagerOptions<User>["authenticate"]>[0]): User {
  const userId = socket.handshake.auth.userId
  if (userId === "alice" || userId === "bob") return { id: userId }

  throw new Error("The host rejected this user")
}

describe("Socket.IO channel consumers", () => {
  test("when host authentication accepts a user, starts the channel", async () => {
    // Arrange
    let channelStarts = 0

    class AuthenticatedChannel extends BaseChannel<User, HostPackets> {
      constructor(user: User, socket: ServerSocket) {
        super(user, socket)
        channelStarts += 1
      }
    }

    const host = await startHost({
      channels: { "/records": AuthenticatedChannel },
      authenticate,
    })
    const transport = openTransport(host.url)
    const accepted: TypedClientSocket = transport.socket("/records", { auth: { userId: "alice" } })
    const subscription = waitForEvent(accepted, "subscribed")

    // Act
    await connectSocket(accepted)
    await subscription

    // Assert
    expect(accepted.connected).toBe(true)
    expect(channelStarts).toBe(1)
  })

  test("when host authentication rejects a user, never starts a channel", async () => {
    // Arrange
    let channelStarts = 0

    class AuthenticatedChannel extends BaseChannel<User, HostPackets> {
      constructor(user: User, socket: ServerSocket) {
        super(user, socket)
        channelStarts += 1
      }
    }

    const host = await startHost({
      channels: { "/records": AuthenticatedChannel },
      authenticate,
    })
    const transport = openTransport(host.url)
    const rejected: TypedClientSocket = transport.socket("/records", {
      auth: { userId: "mallory" },
    })
    const connectionError = waitForEvent(rejected, "connect_error")

    // Act
    rejected.connect()
    const [clientError] = await connectionError

    // Assert
    expect(clientError).toBeInstanceOf(Error)
    expect(channelStarts).toBe(0)
  })

  test("when a connection is recovered, reauthenticates before restoring its channel", async () => {
    // Arrange
    class AuthenticatedChannel extends BaseChannel<User, HostPackets> {
      subscribed(): void {
        this.broadcast("authenticated.user", { userId: this.currentUser.id })
      }
    }

    const host = await startHost({
      channels: { "/records": AuthenticatedChannel },
      authenticate,
      serverOptions: {
        connectionStateRecovery: {
          skipMiddlewares: true,
        },
      },
    })
    const transport = openTransport(host.url)
    const socket: TypedClientSocket = transport.socket("/records", { auth: { userId: "alice" } })
    const initialUser = waitForEvent(socket, "packet")
    await connectSocket(socket)
    const [initialPacket] = await initialUser

    // Act
    const disconnected = waitForEvent(socket, "disconnect")
    transport.engine?.close()
    await disconnected
    const restoredUser = waitForEvent(socket, "packet")
    const rejectedRecovery = waitForEvent(socket, "disconnect").then(() => {
      throw new Error("The recovered channel was disconnected")
    })
    await connectSocket(socket)
    const [user] = await Promise.race([restoredUser, rejectedRecovery])

    // Assert
    expect(initialPacket).toEqual({ type: "authenticated.user", payload: { userId: "alice" } })
    expect(socket.recovered).toBe(true)
    expect(user).toEqual({ type: "authenticated.user", payload: { userId: "alice" } })
  })

  test("when record updates are published, targets only the owning user", async () => {
    // Arrange
    const events = new PubSub<HostEvents>()

    class RecordsChannel extends BaseChannel<User, HostPackets> {
      private readonly onRecordUpdated = (recordId: string, ownerId: string): void => {
        if (this.currentUser.id === ownerId) {
          this.broadcast("records:updated", { recordId })
        }
      }

      constructor(user: User, socket: ServerSocket) {
        super(user, socket)
        socket.on("barrier", (acknowledge: (ready: boolean) => void) => {
          acknowledge(true)
        })
      }

      subscribed(): void {
        events.subscribe("records:updated", this.onRecordUpdated)
        super.subscribed()
      }

      unsubscribed(): void {
        events.unsubscribe("records:updated", this.onRecordUpdated)
        super.unsubscribed()
      }
    }

    const host = await startHost({
      channels: { "/records": RecordsChannel },
      authenticate,
    })
    const aliceTransport = openTransport(host.url)
    const bobTransport = openTransport(host.url)
    const alice: TypedClientSocket = aliceTransport.socket("/records", {
      auth: { userId: "alice" },
    })
    const bob: TypedClientSocket = bobTransport.socket("/records", { auth: { userId: "bob" } })
    const aliceEvents: ChannelPacket<HostPackets>[] = []
    const bobEvents: ChannelPacket<HostPackets>[] = []
    alice.on("packet", (packet) => aliceEvents.push(packet))
    bob.on("packet", (packet) => bobEvents.push(packet))

    const aliceSubscription = waitForEvent(alice, "subscribed")
    const bobSubscription = waitForEvent(bob, "subscribed")

    // Act
    await Promise.all([connectSocket(alice), connectSocket(bob)])
    await Promise.all([aliceSubscription, bobSubscription])

    const aliceRecord = waitForEvent(alice, "packet")
    events.publish("records:updated", "record-1", "alice")
    await aliceRecord
    await acknowledge(bob, "barrier")

    // Assert
    expect(aliceEvents).toEqual([{ type: "records:updated", payload: { recordId: "record-1" } }])
    expect(bobEvents).toEqual([])
  })

  test("when resource packets share a namespace, applies per-resource policy per user", async () => {
    // Arrange
    const events = new PubSub<HostEvents>()
    const recordReaders = new Set(["alice", "bob"])
    const projectReaders = new Set(["alice", "bob"])

    class ApplicationChannel extends BaseChannel<User, HostPackets> {
      protected isCurrentUser(userId: string): boolean {
        return this.currentUser.id === userId
      }
    }

    class UpdatesChannel extends ApplicationChannel {
      constructor(user: User, socket: ServerSocket) {
        super(user, socket)
        socket.on("barrier", (acknowledge: (ready: boolean) => void) => {
          acknowledge(true)
        })
      }

      private readonly onRecordUpdated = (recordId: string, ownerId: string): void => {
        if (this.isCurrentUser(ownerId) && recordReaders.has(this.currentUser.id)) {
          this.broadcast("records:updated", { recordId })
        }
      }

      private readonly onProjectUpdated = (projectId: string, ownerId: string): void => {
        if (this.isCurrentUser(ownerId) && projectReaders.has(this.currentUser.id)) {
          this.broadcast("projects:updated", { projectId })
        }
      }

      subscribed(): void {
        events.subscribe("records:updated", this.onRecordUpdated)
        events.subscribe("projects:updated", this.onProjectUpdated)
        super.subscribed()
      }

      unsubscribed(): void {
        events.unsubscribe("records:updated", this.onRecordUpdated)
        events.unsubscribe("projects:updated", this.onProjectUpdated)
        super.unsubscribed()
      }
    }

    const host = await startHost({
      channels: { "/updates": UpdatesChannel },
      authenticate,
    })
    const aliceTransport = openTransport(host.url)
    const bobTransport = openTransport(host.url)
    const alice: TypedClientSocket = aliceTransport.socket("/updates", {
      auth: { userId: "alice" },
    })
    const bob: TypedClientSocket = bobTransport.socket("/updates", { auth: { userId: "bob" } })
    const alicePackets: ChannelPacket<HostPackets>[] = []
    const bobPackets: ChannelPacket<HostPackets>[] = []
    alice.on("packet", (packet) => alicePackets.push(packet))
    bob.on("packet", (packet) => bobPackets.push(packet))
    const aliceSubscription = waitForEvent(alice, "subscribed")
    const bobSubscription = waitForEvent(bob, "subscribed")

    // Act
    await Promise.all([connectSocket(alice), connectSocket(bob)])
    await Promise.all([aliceSubscription, bobSubscription])

    const aliceRecord = waitForEvent(alice, "packet")
    events.publish("records:updated", "record-1", "alice")
    await aliceRecord
    await acknowledge(bob, "barrier")

    const aliceProject = waitForEvent(alice, "packet")
    events.publish("projects:updated", "project-1", "alice")
    await aliceProject
    await acknowledge(bob, "barrier")

    const bobProject = waitForEvent(bob, "packet")
    events.publish("projects:updated", "project-2", "bob")
    await bobProject
    await acknowledge(alice, "barrier")

    recordReaders.delete("alice")
    events.publish("records:updated", "record-2", "alice")
    await Promise.all([acknowledge(alice, "barrier"), acknowledge(bob, "barrier")])

    // Assert
    expect(alicePackets).toEqual([
      { type: "records:updated", payload: { recordId: "record-1" } },
      { type: "projects:updated", payload: { projectId: "project-1" } },
    ])
    expect(bobPackets).toEqual([{ type: "projects:updated", payload: { projectId: "project-2" } }])
  })

  test("when host events are published, targets only their namespace", async () => {
    // Arrange
    const events = new PubSub<HostEvents>()

    class RecordsChannel extends BaseChannel<User, HostPackets> {
      constructor(user: User, socket: ServerSocket) {
        super(user, socket)
        socket.on("barrier", (acknowledge: (ready: boolean) => void) => {
          acknowledge(true)
        })
      }

      private readonly onRecordUpdated = (recordId: string): void => {
        this.broadcast("records:updated", { recordId })
      }

      subscribed(): void {
        events.subscribe("records:updated", this.onRecordUpdated)
        super.subscribed()
      }

      unsubscribed(): void {
        events.unsubscribe("records:updated", this.onRecordUpdated)
        super.unsubscribed()
      }
    }

    class OtherChannel extends BaseChannel<User, HostPackets> {
      constructor(user: User, socket: ServerSocket) {
        super(user, socket)
        socket.on("barrier", (acknowledge: (ready: boolean) => void) => {
          acknowledge(true)
        })
      }

      private readonly onOtherChanged = (recordId: string): void => {
        this.broadcast("other.changed", { recordId })
      }

      subscribed(): void {
        events.subscribe("other.changed", this.onOtherChanged)
        super.subscribed()
      }

      unsubscribed(): void {
        events.unsubscribe("other.changed", this.onOtherChanged)
        super.unsubscribed()
      }
    }

    const host = await startHost({
      channels: { "/records": RecordsChannel, "/other": OtherChannel },
      authenticate,
    })
    const transport = openTransport(host.url)
    const records: TypedClientSocket = transport.socket("/records", { auth: { userId: "alice" } })
    const other: TypedClientSocket = transport.socket("/other", { auth: { userId: "alice" } })
    const recordEvents: ChannelPacket<HostPackets>[] = []
    const otherEvents: ChannelPacket<HostPackets>[] = []
    records.on("packet", (packet) => recordEvents.push(packet))
    other.on("packet", (packet) => otherEvents.push(packet))
    const recordsSubscription = waitForEvent(records, "subscribed")
    const otherSubscription = waitForEvent(other, "subscribed")

    // Act
    await Promise.all([connectSocket(records), connectSocket(other)])
    await Promise.all([recordsSubscription, otherSubscription])

    const recordEvent = waitForEvent(records, "packet")
    events.publish("records:updated", "record-1", "alice")
    await recordEvent
    await acknowledge(other, "barrier")

    const otherEvent = waitForEvent(other, "packet")
    events.publish("other.changed", "record-2")
    await otherEvent
    await acknowledge(records, "barrier")

    // Assert
    expect(otherEvents).toEqual([{ type: "other.changed", payload: { recordId: "record-2" } }])
    expect(recordEvents).toEqual([{ type: "records:updated", payload: { recordId: "record-1" } }])
  })

  test("when a client disconnects, unsubscribes its host listeners once", async () => {
    // Arrange
    const events = new PubSub<HostEvents>()
    const cleanupFinished = deferred()
    let listenerCalls = 0
    let cleanupCount = 0

    class DisconnectChannel extends BaseChannel<User, HostPackets> {
      private readonly onFailure = (): void => {
        listenerCalls += 1
      }

      subscribed(): void {
        events.subscribe("sync.failure", this.onFailure)
        super.subscribed()
      }

      unsubscribed(): void {
        events.unsubscribe("sync.failure", this.onFailure)
        cleanupCount += 1
        cleanupFinished.resolve()
        super.unsubscribed()
      }
    }

    const host = await startHost({
      channels: { "/records": DisconnectChannel },
      authenticate,
    })
    const transport = openTransport(host.url)
    const socket: TypedClientSocket = transport.socket("/records", { auth: { userId: "alice" } })
    const subscription = waitForEvent(socket, "subscribed")

    // Act
    await connectSocket(socket)
    await subscription
    const disconnected = waitForEvent(socket, "disconnect")
    socket.disconnect()
    await disconnected
    await cleanupFinished.promise
    socket.disconnect()
    events.publish("sync.failure")
    await host.manager.close()
    const cleanupAfterClose = cleanupCount

    // Assert
    expect(cleanupCount).toBe(1)
    expect(cleanupAfterClose).toBe(1)
    expect(listenerCalls).toBe(0)
  })

  test("when sync and async listeners fail, recovers with socket-local invalidation", async () => {
    // Arrange
    const events = new PubSub<HostEvents>()

    class RecoveryChannel extends BaseChannel<User, HostPackets> {
      private readonly onSyncFailure = (): void => {
        throw new Error("synchronous listener failure")
      }

      private readonly onAsyncFailure = async (): Promise<void> => {
        throw new Error("asynchronous listener failure")
      }

      subscribed(): void {
        events.subscribe("sync.failure", this.onSyncFailure, () => this.invalidate())
        events.subscribe("async.failure", this.onAsyncFailure, async () => {
          await Promise.resolve()
          this.invalidate()
        })
        super.subscribed()
      }

      unsubscribed(): void {
        events.unsubscribe("sync.failure", this.onSyncFailure)
        events.unsubscribe("async.failure", this.onAsyncFailure)
        super.unsubscribed()
      }
    }

    const host = await startHost({
      channels: { "/records": RecoveryChannel },
      authenticate,
    })
    const transport = openTransport(host.url)
    const socket: TypedClientSocket = transport.socket("/records", { auth: { userId: "alice" } })
    const subscription = waitForEvent(socket, "subscribed")

    // Act
    await connectSocket(socket)
    await subscription

    const syncInvalidation = waitForEvent(socket, "invalidated")
    events.publish("sync.failure")
    const receivedSyncInvalidation = await syncInvalidation

    const asyncInvalidation = waitForEvent(socket, "invalidated")
    events.publish("async.failure")
    const receivedAsyncInvalidation = await asyncInvalidation

    // Assert
    expect(receivedSyncInvalidation).toEqual([])
    expect(receivedAsyncInvalidation).toEqual([])
  })

  test("when an async callback is canceled, does not broadcast after its deferred work", async () => {
    // Arrange
    const events = new PubSub<HostEvents>()
    const gate = deferred()
    const callbackStarted = deferred()
    const callbackFinished = deferred()
    const deliveredMessages: string[] = []

    class SuccessChannel extends BaseChannel<User, HostPackets> {
      private signal: AbortSignal | undefined

      private readonly onSuccess = async (): Promise<void> => {
        callbackStarted.resolve()
        try {
          await gate.promise
          if (this.signal?.aborted !== true) {
            this.broadcast("late.success", { message: "late.success" })
          }
        } finally {
          callbackFinished.resolve()
        }
      }

      constructor(user: User, socket: ServerSocket) {
        super(user, socket)
        socket.on("cancel-work", (acknowledge: (aborted: boolean) => void) => {
          events.unsubscribe("success.after.cancel", this.onSuccess)
          acknowledge(this.signal?.aborted === true)
        })
        socket.on("barrier", (acknowledge: (ready: boolean) => void) => {
          acknowledge(true)
        })
      }

      subscribed(): void {
        this.signal = events.subscribe("success.after.cancel", this.onSuccess)
        super.subscribed()
      }

      unsubscribed(): void {
        events.unsubscribe("success.after.cancel", this.onSuccess)
        super.unsubscribed()
      }
    }

    const host = await startHost({
      channels: { "/records": SuccessChannel },
      authenticate,
    })
    const transport = openTransport(host.url)
    const socket: TypedClientSocket = transport.socket("/records", { auth: { userId: "alice" } })
    socket.on("packet", (packet) => {
      if (packet.type === "late.success") deliveredMessages.push(packet.payload.message)
    })
    const subscription = waitForEvent(socket, "subscribed")

    // Act
    await connectSocket(socket)
    await subscription
    events.publish("success.after.cancel")
    await callbackStarted.promise
    const aborted = await acknowledge(socket, "cancel-work")
    gate.resolve()
    await callbackFinished.promise
    await acknowledge(socket, "barrier")

    // Assert
    expect(aborted).toBe(true)
    expect(deliveredMessages).toEqual([])
  })

  test("when an async callback fails after cancellation, suppresses recovery", async () => {
    // Arrange
    const events = new PubSub<HostEvents>()
    const gate = deferred()
    const callbackStarted = deferred()
    const callbackFinished = deferred()
    const invalidations: string[] = []
    let recoveryCount = 0

    class FailureChannel extends BaseChannel<User, HostPackets> {
      private signal: AbortSignal | undefined

      private readonly onFailure = async (): Promise<void> => {
        callbackStarted.resolve()
        try {
          await gate.promise
          throw new Error("failure after cancellation")
        } finally {
          callbackFinished.resolve()
        }
      }

      constructor(user: User, socket: ServerSocket) {
        super(user, socket)
        socket.on("cancel-work", (acknowledge: (aborted: boolean) => void) => {
          events.unsubscribe("failure.after.cancel", this.onFailure)
          acknowledge(this.signal?.aborted === true)
        })
        socket.on("barrier", (acknowledge: (ready: boolean) => void) => {
          acknowledge(true)
        })
      }

      subscribed(): void {
        this.signal = events.subscribe("failure.after.cancel", this.onFailure, () => {
          recoveryCount += 1
          this.invalidate()
        })
        super.subscribed()
      }

      unsubscribed(): void {
        events.unsubscribe("failure.after.cancel", this.onFailure)
        super.unsubscribed()
      }
    }

    const host = await startHost({
      channels: { "/records": FailureChannel },
      authenticate,
    })
    const transport = openTransport(host.url)
    const socket: TypedClientSocket = transport.socket("/records", { auth: { userId: "alice" } })
    socket.on("invalidated", () => invalidations.push("invalidated"))
    const subscription = waitForEvent(socket, "subscribed")

    // Act
    await connectSocket(socket)
    await subscription
    events.publish("failure.after.cancel")
    await callbackStarted.promise
    const aborted = await acknowledge(socket, "cancel-work")
    gate.resolve()
    await callbackFinished.promise
    await acknowledge(socket, "barrier")

    // Assert
    expect(aborted).toBe(true)
    expect(recoveryCount).toBe(0)
    expect(invalidations).toEqual([])
  })

  test("when channel initialization fails, cleans it without disconnecting other namespaces", async () => {
    // Arrange
    const events = new PubSub<HostEvents>()
    const initializationStarted = deferred()
    const cleanupFinished = deferred()
    const errorReported = deferred()
    let listenerCalls = 0
    let cleanupCount = 0

    class FailedChannel extends BaseChannel<User, HostPackets> {
      private readonly onPartialUpdate = (): void => {
        listenerCalls += 1
      }

      async subscribed(): Promise<void> {
        events.subscribe("sync.failure", this.onPartialUpdate)
        initializationStarted.resolve()
        throw new Error("partial initialization failed")
      }

      async unsubscribed(): Promise<void> {
        events.unsubscribe("sync.failure", this.onPartialUpdate)
        cleanupCount += 1
        cleanupFinished.resolve()
      }
    }

    class HealthyChannel extends BaseChannel<User, HostPackets> {
      subscribed(): void {
        this.socket.on("barrier", (acknowledge: (ready: boolean) => void) => {
          acknowledge(true)
        })
        super.subscribed()
      }
    }

    const host = await startHost({
      channels: { "/records": FailedChannel, "/other": HealthyChannel },
      authenticate,
      onError() {
        errorReported.resolve()
        throw new Error("host reporting failed")
      },
    })
    const transport = openTransport(host.url)
    const failed: TypedClientSocket = transport.socket("/records", { auth: { userId: "alice" } })
    const healthy: TypedClientSocket = transport.socket("/other", { auth: { userId: "alice" } })
    const failedDisconnect = waitForEvent(failed, "disconnect")
    const healthySubscription = waitForEvent(healthy, "subscribed")

    // Act
    failed.connect()
    await connectSocket(healthy)
    await healthySubscription
    await Promise.all([
      initializationStarted.promise,
      cleanupFinished.promise,
      errorReported.promise,
      failedDisconnect,
    ])

    const cleanupAfterInitialization = cleanupCount
    events.publish("sync.failure")
    await acknowledge(healthy, "barrier")

    // Assert
    expect(cleanupAfterInitialization).toBe(1)
    expect(listenerCalls).toBe(0)
    expect(healthy.connected).toBe(true)
  })

  test("when close begins during initialization, repeated closes wait for one cleanup", async () => {
    // Arrange
    const initializationStarted = deferred()
    const finishInitialization = deferred()
    const cleanupFinished = deferred()
    let cleanupCount = 0

    class SlowChannel extends BaseChannel<User, HostPackets> {
      async subscribed(): Promise<void> {
        initializationStarted.resolve()
        await finishInitialization.promise
      }

      async unsubscribed(): Promise<void> {
        cleanupCount += 1
        cleanupFinished.resolve()
      }
    }

    const host = await startHost({
      channels: { "/records": SlowChannel },
      authenticate,
    })
    const transport = openTransport(host.url)
    const socket: TypedClientSocket = transport.socket("/records", { auth: { userId: "alice" } })

    // Act
    await connectSocket(socket)
    await initializationStarted.promise

    const disconnected = waitForEvent(socket, "disconnect")
    const closing = host.manager.close()
    const repeatedClose = host.manager.close()
    await disconnected
    const cleanupBeforeInitializationFinished = cleanupCount

    finishInitialization.resolve()
    await Promise.all([closing, repeatedClose])
    await cleanupFinished.promise
    const cleanupAfterClose = cleanupCount
    await host.manager.close()
    const cleanupAfterRepeatedClose = cleanupCount

    // Assert
    expect(cleanupBeforeInitializationFinished).toBe(0)
    expect(cleanupAfterClose).toBe(1)
    expect(cleanupAfterRepeatedClose).toBe(1)
  })
})
