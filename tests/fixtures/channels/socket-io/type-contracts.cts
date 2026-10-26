import { createServer } from "node:http"
import type { Server as HttpServer } from "node:http"

import type { Socket } from "socket.io"

import channels = require("express-light-rail/channels/socket-io")

type User = { id: string; role: "member" | "admin" }
type HostEvents = {
  "record.changed": [recordId: string, ownerId: string]
  "records.reloaded": []
}

const events = new channels.PubSub<HostEvents>()
events.publish("record.changed", "record-1", "alice")
events.publish("records.reloaded")
const subscription: AbortSignal = events.subscribe("record.changed", (recordId, ownerId) => {
  const message: string = `${recordId}:${ownerId}`
  void message
})
void subscription

// @ts-expect-error the host event requires both tuple values
events.publish("record.changed", "record-1")
// @ts-expect-error event names belong to the host's event catalog
events.publish("record.archived", "record-1")

class RecordsChannel extends channels.BaseChannel<User> {}

const routes: channels.ChannelRoutes<User> = { "/records": RecordsChannel }
const server: HttpServer = createServer()
const options: channels.ChannelManagerOptions<User> = {
  channels: routes,
  authenticate: async () => ({ id: "alice", role: "member" }),
  onError: (error: unknown, socket: Socket) => {
    void error
    socket.emit("host.error")
  },
}
const manager = new channels.ChannelManager<User>(server, options)
void manager

const invalidOptions: channels.ChannelManagerOptions<User> = {
  channels: routes,
  // @ts-expect-error host authentication must return the complete user context
  authenticate: async () => ({ id: "alice" }),
}
void invalidOptions
