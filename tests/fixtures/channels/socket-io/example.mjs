import { createServer } from "node:http"

import express from "express"
import { BaseChannel, ChannelManager, PubSub } from "express-light-rail/channels/socket-io"

const users = new Map([
  ["alice", { id: "alice", name: "Alice", projectIds: ["project-1"] }],
  ["bob", { id: "bob", name: "Bob", projectIds: ["project-2"] }],
])
const resourceEvents = new PubSub()

class RecordPolicy {
  static canReceive(user, record) {
    return record.ownerId === user.id
  }
}

class ProjectPolicy {
  static canReceive(user, project) {
    return project.ownerId === user.id && user.projectIds.includes(project.id)
  }
}

class ApplicationChannel extends BaseChannel {
  constructor(user, socket) {
    super(user, socket)
    this.onRecordUpdated = (record) => {
      if (RecordPolicy.canReceive(this.currentUser, record)) {
        this.broadcast({
          type: "record.updated",
          payload: { id: record.id, value: record.value },
        })
      }
    }
    this.onProjectUpdated = (project) => {
      if (ProjectPolicy.canReceive(this.currentUser, project)) {
        this.broadcast({
          type: "project.updated",
          payload: { id: project.id, name: project.name },
        })
      }
    }
  }

  subscribed() {
    resourceEvents.subscribe("record.updated", this.onRecordUpdated)
    resourceEvents.subscribe("project.updated", this.onProjectUpdated)
    super.subscribed()
  }

  unsubscribed() {
    resourceEvents.unsubscribe("record.updated", this.onRecordUpdated)
    resourceEvents.unsubscribe("project.updated", this.onProjectUpdated)
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

  resourceEvents.publish("record.updated", record)
  return response.status(201).json({ record })
})
app.post("/projects", (request, response) => {
  const project = {
    id: String(request.body.id),
    ownerId: String(request.body.ownerId),
    name: String(request.body.name),
  }
  if (!users.has(project.ownerId)) {
    return response.status(400).json({ error: "Unknown project owner" })
  }

  resourceEvents.publish("project.updated", project)
  return response.status(201).json({ project })
})

const httpServer = createServer(app)
const channelManager = new ChannelManager(httpServer, {
  channels: { "/updates": ApplicationChannel },
  authenticate(socket) {
    const user = users.get(socket.handshake.auth.userId)
    if (user === undefined) throw new Error("The host rejected this user")
    return user
  },
})
const port = Number(process.env.PORT ?? 3000)
httpServer.listen(port, () => {
  process.stdout.write(`HTTP API listening on ${port}; Socket.IO namespace /updates\n`)
  process.stdout.write(
    "Demonstration auth: userId alice or bob. POST /records and /projects to publish resource packets.\n"
  )
})

process.once("SIGINT", () => {
  void channelManager.close()
})
