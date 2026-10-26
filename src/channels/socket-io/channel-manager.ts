import type { Server as HttpServer } from "node:http"
import { Server, type ServerOptions, type Socket } from "socket.io"

import type { BaseChannel } from "@/channels/socket-io/base-channel.js"
import { logger } from "@/utils/logger.js"

export type ChannelRoutes<User> = Readonly<
  Record<string, new (user: User, socket: Socket) => BaseChannel<User>>
>

export type ChannelManagerOptions<User> = {
  channels: ChannelRoutes<User>
  authenticate: (socket: Socket) => User | Promise<User>
  serverOptions?: Partial<ServerOptions>
  onError?: (error: unknown, socket: Socket) => void | Promise<void>
}

export class ChannelManager<User> {
  readonly server: Server

  // Authentication belongs to one socket, never a namespace-wide current user.
  private readonly users = new WeakMap<Socket, User>()
  // Retain cleanup until initialization and teardown settle, including failed initialization.
  private readonly connections = new Map<Socket, () => Promise<void>>()
  private closing = false
  private closePromise?: Promise<void>

  constructor(
    server: HttpServer,
    private readonly options: ChannelManagerOptions<User>
  ) {
    const serverOptions = options.serverOptions
    if (serverOptions?.connectionStateRecovery) {
      // Recovered sockets need fresh authentication before channel construction too.
      this.server = new Server(server, {
        ...serverOptions,
        connectionStateRecovery: {
          ...serverOptions.connectionStateRecovery,
          skipMiddlewares: false,
        },
      })
    } else {
      this.server = new Server(server, serverOptions)
    }

    for (const [path, ChannelClass] of Object.entries(options.channels)) {
      const namespace = this.server.of(path)
      namespace.use((socket, next) => {
        void this.authenticate(socket, next)
      })
      namespace.on("connection", (socket) => {
        const user = this.users.get(socket)
        this.users.delete(socket)
        if (user === undefined || this.closing) {
          socket.disconnect()
          return
        }

        this.connect(socket, user, ChannelClass)
      })
    }
  }

  close(): Promise<void> {
    if (!this.closePromise) this.closePromise = this.shutdown()

    return this.closePromise
  }

  private async authenticate(socket: Socket, next: (error?: Error) => void): Promise<void> {
    try {
      if (this.closing) throw new Error("Channel manager is closing")

      const user = await this.options.authenticate(socket)
      if (user === null || user === undefined) throw new Error("Authenticated user is required")
      if (this.closing) throw new Error("Channel manager is closing")

      this.users.set(socket, user)
      next()
    } catch (error) {
      void this.reportError(error, socket)
      next(new Error("Channel authentication failed"))
    }
  }

  private connect(
    socket: Socket,
    user: User,
    ChannelClass: new (user: User, socket: Socket) => BaseChannel<User>
  ): void {
    let channel: BaseChannel<User> | undefined
    let cleanupPromise: Promise<void> | undefined
    // Defer the hook until tracking and the disconnect listener are installed.
    const initialization = Promise.resolve().then(async () => {
      if (this.closing || !socket.connected) return

      channel = new ChannelClass(user, socket)
      await channel.subscribed()
    })
    const cleanup = (): Promise<void> => {
      if (!cleanupPromise) {
        cleanupPromise = (async () => {
          // Initialization failure is reported below; teardown must still run.
          await initialization.catch(() => {})
          try {
            await channel?.unsubscribed()
          } catch (error) {
            void this.reportError(error, socket)
          } finally {
            socket.off("disconnect", disconnected)
            this.connections.delete(socket)
          }
        })()
      }
      return cleanupPromise
    }
    const disconnected = (): void => {
      void cleanup()
    }
    this.connections.set(socket, cleanup)
    socket.once("disconnect", disconnected)
    void initialization.then(
      () => {
        if (this.closing || !socket.connected) void cleanup()
      },
      (error: unknown) => {
        socket.disconnect()
        void cleanup()
        void this.reportError(error, socket)
      }
    )
  }

  private async shutdown(): Promise<void> {
    this.closing = true
    for (const socket of this.connections.keys()) socket.disconnect(true)

    await Promise.all(Array.from(this.connections.values(), (cleanup) => cleanup()))
    await this.server.close()
  }

  private async reportError(error: unknown, socket: Socket): Promise<void> {
    logger.error("Channel operation failed", {
      error,
      namespace: socket.nsp.name,
      socketId: socket.id,
    })
    try {
      await this.options.onError?.(error, socket)
    } catch (reportingError) {
      logger.error("Channel error reporting failed", {
        error: reportingError,
        namespace: socket.nsp.name,
        socketId: socket.id,
      })
    }
  }
}
