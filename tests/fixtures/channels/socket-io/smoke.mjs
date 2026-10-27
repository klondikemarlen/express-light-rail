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
    constructor(user, socket) {
      super(user, socket)
      this.onRecordUpdated = (record) => {
        if (record.ownerId === this.currentUser.id) {
          this.broadcast({
            type: "record.updated",
            payload: { id: record.id, value: record.value },
          })
        }
      }
      this.onProjectUpdated = (project) => {
        const canReceiveProject =
          project.ownerId === this.currentUser.id &&
          this.currentUser.projectIds.includes(project.id)
        if (canReceiveProject) {
          this.broadcast({
            type: "project.updated",
            payload: { id: project.id, name: project.name },
          })
        }
      }
      socket.on("barrier", (acknowledge) => acknowledge(true))
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

  const channelManager = new channelExports.ChannelManager(httpServer, {
    channels: { "/updates": ApplicationChannel },
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

    const recordForAlice = waitForPacket(alice, "record.updated")
    resourceEvents.publish("record.updated", {
      id: "record-1",
      ownerId: "alice",
      value: "draft",
    })
    assert.deepEqual(await recordForAlice, {
      type: "record.updated",
      payload: { id: "record-1", value: "draft" },
    })
    await acknowledge(bob, "barrier")

    const projectForBob = waitForPacket(bob, "project.updated")
    resourceEvents.publish("project.updated", {
      id: "project-2",
      ownerId: "bob",
      name: "Roadmap",
    })
    assert.deepEqual(await projectForBob, {
      type: "project.updated",
      payload: { id: "project-2", name: "Roadmap" },
    })
    await acknowledge(alice, "barrier")

    assert.deepEqual(alicePackets, [
      { type: "record.updated", payload: { id: "record-1", value: "draft" } },
    ])
    assert.deepEqual(bobPackets, [
      { type: "project.updated", payload: { id: "project-2", name: "Roadmap" } },
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
