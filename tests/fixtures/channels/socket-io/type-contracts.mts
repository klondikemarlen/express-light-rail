import { createServer } from "node:http"
import type { Server as HttpServer } from "node:http"

import type { Socket as ClientSocket } from "socket.io-client"
import type { Socket as ServerSocket } from "socket.io"
import {
  BaseChannel,
  ChannelManager,
  PubSub,
  type ChannelManagerOptions,
  type ChannelPacket,
  type ChannelRoutes,
  type ChannelServerEvents,
} from "express-light-rail/channels/socket-io"

type User = { id: string; role: "member" | "admin" }
type Packets = {
  "record.updated": { recordId: string; title: string }
  "records.reloaded": { count: number }
}
type ClientEvents = {
  "record.acknowledged": (recordId: string) => void
}
type HostEvents = {
  "record.changed": [recordId: string, ownerId: string]
  "records.reloaded": []
}

const events = new PubSub<HostEvents>()
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

class RecordsChannel extends BaseChannel<User, Packets> {}

const validPacket: ChannelPacket<Packets> = {
  type: "record.updated",
  payload: { recordId: "record-1", title: "Annual report" },
}
const invalidLabel: ChannelPacket<Packets> = {
  // @ts-expect-error packet labels belong to the host catalog
  type: "record.archived",
  payload: { recordId: "record-1", title: "Annual report" },
}
const invalidPayload: ChannelPacket<Packets> = {
  type: "records.reloaded",
  payload: {
    // @ts-expect-error the selected label requires a numeric count
    count: "3",
  },
}
declare const dynamicType: keyof Packets
declare function acceptPacket(packet: ChannelPacket<Packets>): void
// @ts-expect-error a union label cannot be paired with only one label's payload
acceptPacket({ type: dynamicType, payload: { count: 3 } })
void validPacket
void invalidLabel
void invalidPayload

declare const packet: ChannelPacket<Packets>
if (packet.type === "record.updated") {
  const title: string = packet.payload.title
  void title
} else {
  const count: number = packet.payload.count
  void count
}

declare const client: ClientSocket<ChannelServerEvents<Packets>, ClientEvents>
client.on("packet", (receivedPacket) => {
  if (receivedPacket.type === "record.updated") {
    const recordId: string = receivedPacket.payload.recordId
    void recordId
  }
})
client.on("subscribed", () => {})
client.emit("record.acknowledged", "record-1")

const routes: ChannelRoutes<User> = { "/records": RecordsChannel }
const server: HttpServer = createServer()
const options: ChannelManagerOptions<User> = {
  channels: routes,
  authenticate: async () => ({ id: "alice", role: "member" }),
  onError: (error: unknown, socket: ServerSocket) => {
    void error
    socket.emit("host.error")
  },
}
const manager = new ChannelManager<User>(server, options)
void manager

const invalidOptions: ChannelManagerOptions<User> = {
  channels: routes,
  // @ts-expect-error host authentication must return the complete user context
  authenticate: async () => ({ id: "alice" }),
}
void invalidOptions
