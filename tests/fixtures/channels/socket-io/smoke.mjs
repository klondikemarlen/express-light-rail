import assert from "node:assert/strict"
import { createServer } from "node:http"
import { createRequire } from "node:module"

import express from "express"
import { Manager } from "socket.io-client"

import * as esmChannels from "express-light-rail/channels/socket-io"

const require = createRequire(import.meta.url)
const commonjsChannels = require("express-light-rail/channels/socket-io")

function waitForEvent(socket, event) {
  return new Promise((resolve) => socket.once(event, (...payload) => resolve(payload)))
}

function waitForPacket(socket, packetType) {
  return new Promise((resolve) => {
    const receivePacket = (packet) => {
      if (packet.type !== packetType) return
      socket.off("packet", receivePacket)
      resolve(packet)
    }
    socket.on("packet", receivePacket)
  })
}

function connect(socket) {
  return new Promise((resolve, reject) => {
    socket.once("connect", resolve)
    socket.once("connect_error", reject)
    socket.connect()
  })
}

function acknowledge(socket, event) {
  return new Promise((resolve) => socket.emit(event, resolve))
}

async function verifyInstalledFormat(channelExports, format) {
  const resourceEvents = new channelExports.PubSub()
  const app = express()
  app.get("/health", (_request, response) => response.sendStatus(204))
  const httpServer = createServer(app)
  const users = new Map([
    ["alice", { id: "alice", projectIds: ["project-1"] }],
    ["bob", { id: "bob", projectIds: ["project-2"] }],
  ])

  class ApplicationChannel extends channelExports.BaseChannel {
    isCurrentUser(userId) {
      return this.currentUser.id === userId
    }
  }

  class UpdatesChannel extends ApplicationChannel {
    constructor(user, socket) {
      super(user, socket)
      this.onRecordUpdated = (record) => {
        if (this.isCurrentUser(record.ownerId)) {
          this.broadcast("records:updated", { id: record.id, value: record.value })
        }
      }
      this.onProjectUpdated = (project) => {
        const canReceiveProject =
          this.isCurrentUser(project.ownerId) && this.currentUser.projectIds.includes(project.id)
        if (canReceiveProject) {
          this.broadcast("projects:updated", { id: project.id, name: project.name })
        }
      }
      socket.on("barrier", (acknowledge) => acknowledge(true))
    }

    subscribed() {
      resourceEvents.subscribe("records:updated", this.onRecordUpdated)
      resourceEvents.subscribe("projects:updated", this.onProjectUpdated)
      super.subscribed()
    }

    unsubscribed() {
      resourceEvents.unsubscribe("records:updated", this.onRecordUpdated)
      resourceEvents.unsubscribe("projects:updated", this.onProjectUpdated)
      super.unsubscribed()
    }
  }

  const channelManager = new channelExports.ChannelManager(httpServer, {
    channels: { "/updates": UpdatesChannel },
    authenticate(socket) {
      const user = users.get(socket.handshake.auth.userId)
      if (user === undefined) throw new Error("The host rejected this user")
      return user
    },
  })
  await new Promise((resolve) => httpServer.listen(0, resolve))
  const address = httpServer.address()
  assert.notEqual(address, null)
  assert.equal(typeof address, "object")

  const serverUrl = `http://127.0.0.1:${address.port}`
  const aliceManager = new Manager(serverUrl, {
    autoConnect: false,
    reconnection: false,
    timeout: 5_000,
  })
  const bobManager = new Manager(serverUrl, {
    autoConnect: false,
    reconnection: false,
    timeout: 5_000,
  })
  const alice = aliceManager.socket("/updates", { auth: { userId: "alice" } })
  const bob = bobManager.socket("/updates", { auth: { userId: "bob" } })
  const alicePackets = []
  const bobPackets = []
  alice.on("packet", (packet) => alicePackets.push(packet))
  bob.on("packet", (packet) => bobPackets.push(packet))

  try {
    const aliceSubscription = waitForEvent(alice, "subscribed")
    const bobSubscription = waitForEvent(bob, "subscribed")
    await Promise.all([connect(alice), connect(bob)])
    await Promise.all([aliceSubscription, bobSubscription])

    const recordForAlice = waitForPacket(alice, "records:updated")
    resourceEvents.publish("records:updated", {
      id: "record-1",
      ownerId: "alice",
      value: "draft",
    })
    assert.deepEqual(await recordForAlice, {
      type: "records:updated",
      payload: { id: "record-1", value: "draft" },
    })
    await acknowledge(bob, "barrier")

    const projectForBob = waitForPacket(bob, "projects:updated")
    resourceEvents.publish("projects:updated", {
      id: "project-2",
      ownerId: "bob",
      name: "Roadmap",
    })
    assert.deepEqual(await projectForBob, {
      type: "projects:updated",
      payload: { id: "project-2", name: "Roadmap" },
    })
    await acknowledge(alice, "barrier")

    assert.deepEqual(alicePackets, [
      { type: "records:updated", payload: { id: "record-1", value: "draft" } },
    ])
    assert.deepEqual(bobPackets, [
      { type: "projects:updated", payload: { id: "project-2", name: "Roadmap" } },
    ])
    process.stdout.write(
      `${format} package export delivered two policy-filtered resource packets\n`
    )
  } finally {
    alice.disconnect()
    bob.disconnect()
    aliceManager.engine?.close()
    bobManager.engine?.close()
    await channelManager.close()
  }
}

await verifyInstalledFormat(esmChannels, "ESM")
await verifyInstalledFormat(commonjsChannels, "CommonJS")
