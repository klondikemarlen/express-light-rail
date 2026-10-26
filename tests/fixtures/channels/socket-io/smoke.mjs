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
  const events = new channelExports.PubSub()
  const app = express()
  app.get("/health", (_request, response) => response.sendStatus(204))
  const httpServer = createServer(app)
  const users = new Map([
    ["alice", { id: "alice" }],
    ["bob", { id: "bob" }],
  ])

  class RecordsChannel extends channelExports.BaseChannel {
    constructor(user, socket) {
      super(user, socket)
      this.onRecordUpdated = (recordId, ownerId) => {
        if (this.currentUser.id === ownerId) {
          this.broadcast("record.updated", recordId)
        }
      }
      socket.on("barrier", (acknowledge) => acknowledge(true))
    }

    subscribed() {
      events.subscribe("record.updated", this.onRecordUpdated)
      super.subscribed()
    }

    unsubscribed() {
      events.unsubscribe("record.updated", this.onRecordUpdated)
      super.unsubscribed()
    }
  }

  const channelManager = new channelExports.ChannelManager(httpServer, {
    channels: { "/records": RecordsChannel },
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
  const alice = aliceManager.socket("/records", { auth: { userId: "alice" } })
  const bob = bobManager.socket("/records", { auth: { userId: "bob" } })
  const aliceEvents = []
  const bobEvents = []
  alice.on("record.updated", (recordId) => aliceEvents.push(recordId))
  bob.on("record.updated", (recordId) => bobEvents.push(recordId))

  try {
    const aliceSubscription = waitForEvent(alice, "subscribed")
    const bobSubscription = waitForEvent(bob, "subscribed")
    await Promise.all([connect(alice), connect(bob)])
    await Promise.all([aliceSubscription, bobSubscription])

    const receivedByAlice = waitForEvent(alice, "record.updated")
    events.publish("record.updated", "record-1", "alice")
    assert.deepEqual(await receivedByAlice, ["record-1"])
    assert.equal(await acknowledge(bob, "barrier"), true)
    assert.deepEqual(aliceEvents, ["record-1"])
    assert.deepEqual(bobEvents, [])
    process.stdout.write(`${format} package export delivered only Alice's record event\n`)
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
