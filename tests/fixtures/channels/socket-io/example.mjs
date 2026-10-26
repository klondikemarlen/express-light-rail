import { createServer } from "node:http"

import express from "express"
import { BaseChannel, ChannelManager, PubSub } from "express-light-rail/channels/socket-io"

const users = new Map([
  ["alice", { id: "alice", name: "Alice" }],
  ["bob", { id: "bob", name: "Bob" }],
])
const recordEvents = new PubSub()

class RecordsPolicy {
  static canReceive(user, record) {
    return record.ownerId === user.id
  }
}

class RecordUpdatesChannel extends BaseChannel {
  constructor(user, socket) {
    super(user, socket)
    this.onRecordUpdated = (record) => {
      if (RecordsPolicy.canReceive(this.currentUser, record)) {
        this.broadcast("record.updated", record)
      }
    }
  }

  subscribed() {
    recordEvents.subscribe("record.updated", this.onRecordUpdated)
    super.subscribed()
  }

  unsubscribed() {
    recordEvents.unsubscribe("record.updated", this.onRecordUpdated)
    super.unsubscribed()
  }
}

const app = express()
app.use(express.json())
app.get("/health", (_request, response) => response.sendStatus(204))
app.post("/records", (request, response) => {
  const record = {
    id: String(request.body.id),
    ownerId: String(request.body.ownerId),
    value: request.body.value,
  }
  if (!users.has(record.ownerId)) {
    return response.status(400).json({ error: "Unknown record owner" })
  }

  recordEvents.publish("record.updated", record)
  return response.status(201).json({ record })
})

const httpServer = createServer(app)
const channelManager = new ChannelManager(httpServer, {
  channels: { "/records": RecordUpdatesChannel },
  authenticate(socket) {
    const user = users.get(socket.handshake.auth.userId)
    if (user === undefined) throw new Error("The host rejected this user")
    return user
  },
})
const port = Number(process.env.PORT ?? 3000)
httpServer.listen(port, () => {
  process.stdout.write(`HTTP API listening on ${port}; Socket.IO namespace /records\n`)
  process.stdout.write(
    "Authenticate with userId alice or bob; POST /records to publish a record event.\n"
  )
})

process.once("SIGINT", () => {
  void channelManager.close()
})
