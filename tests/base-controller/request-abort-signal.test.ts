import { EventEmitter } from "node:events"
import { get, type ClientRequest, type Server } from "node:http"
import express, { type Request, type Response } from "express"
import request from "supertest"

import { requestAbortSignal } from "@/base-controller/request-abort-signal.js"

function createRequest(overrides: { aborted?: boolean; signal?: unknown } = {}): Request {
  return Object.assign(new EventEmitter(), { aborted: false, ...overrides }) as unknown as Request
}

function createResponse(
  overrides: { destroyed?: boolean; writableFinished?: boolean } = {}
): Response {
  return Object.assign(new EventEmitter(), {
    destroyed: false,
    writableFinished: false,
    ...overrides,
  }) as unknown as Response
}

describe("requestAbortSignal", () => {
  test("when a host provides a signal, reuses it without taking lifecycle ownership", () => {
    // Arrange
    const hostController = new AbortController()
    const request = createRequest({ signal: hostController.signal })
    const response = createResponse()

    // Act
    const signal = requestAbortSignal(request, response)
    request.emit("aborted")
    response.emit("close")

    // Assert
    expect(signal).toBe(hostController.signal)
    expect(signal.aborted).toBe(false)
  })

  test("when the request was already aborted before response completion, returns an aborted signal", () => {
    // Arrange
    const request = createRequest({ aborted: true })
    const response = createResponse()

    // Act
    const signal = requestAbortSignal(request, response)

    // Assert
    expect(signal.aborted).toBe(true)
  })

  test("when the response was already destroyed before completion, returns an aborted signal", () => {
    // Arrange
    const request = createRequest()
    const response = createResponse({ destroyed: true })

    // Act
    const signal = requestAbortSignal(request, response)

    // Assert
    expect(signal.aborted).toBe(true)
  })

  test("when signal setup follows response completion, leaves the new signal active", () => {
    // Arrange
    const request = createRequest({ aborted: true })
    const response = createResponse({ destroyed: true, writableFinished: true })

    // Act
    const signal = requestAbortSignal(request, response)
    request.emit("aborted")
    response.emit("close")

    // Assert
    expect(signal.aborted).toBe(false)
  })

  test("when the request emits aborted, cancels and removes the owned listeners", () => {
    // Arrange
    const request = createRequest()
    const response = createResponse()
    const signal = requestAbortSignal(request, response)

    // Act
    request.emit("aborted")

    // Assert
    expect(signal.aborted).toBe(true)
    expect(request.listenerCount("aborted")).toBe(0)
    expect(response.listenerCount("close")).toBe(0)
    expect(response.listenerCount("finish")).toBe(0)
  })

  test("when a response finishes normally, keeps the signal active and removes the owned listeners", () => {
    // Arrange
    const request = createRequest()
    const response = createResponse()
    const signal = requestAbortSignal(request, response)

    // Act
    Object.assign(response, { writableFinished: true })
    response.emit("finish")

    // Assert
    expect(signal.aborted).toBe(false)
    expect(request.listenerCount("aborted")).toBe(0)
    expect(response.listenerCount("close")).toBe(0)
    expect(response.listenerCount("finish")).toBe(0)
  })

  test("when request bodies complete and responses succeed, keeps independent request signals active", async () => {
    // Arrange
    const app = express()
    const signals: AbortSignal[] = []

    app.use((request, response, next) => {
      signals.push(requestAbortSignal(request, response))
      next()
    })
    app.use(express.json())
    app.post("/examples", (request, response) => {
      response.json({ received: request.body })
    })

    // Act
    await request(app).post("/examples").send({ value: 1 }).expect(200)
    await request(app).post("/examples").send({ value: 2 }).expect(200)

    // Assert
    expect(signals[0]).not.toBe(signals[1])
    expect(signals.every((signal) => !signal.aborted)).toBe(true)
  })

  test("when the client disconnects before a response finishes, cancels the request signal", async () => {
    // Arrange
    const app = express()
    const routeEntered = Promise.withResolvers<AbortSignal>()
    const responseClosed = Promise.withResolvers<void>()

    app.get("/examples", (request, response) => {
      const signal = requestAbortSignal(request, response)
      response.once("close", () => responseClosed.resolve())
      routeEntered.resolve(signal)
      response.write("pending response")
    })

    const serverStarted = Promise.withResolvers<Server>()
    const server = app.listen(0)
    server.once("listening", () => serverStarted.resolve(server))
    server.once("error", (error) => serverStarted.reject(error))

    let clientRequest: ClientRequest | undefined

    try {
      await serverStarted.promise
      const address = server.address()
      if (!address || typeof address === "string") {
        throw new Error("Expected the test server to listen on a TCP port")
      }

      clientRequest = get({ host: "127.0.0.1", port: address.port, path: "/examples" })
      clientRequest.on("error", () => undefined)
      const signal = await routeEntered.promise

      // Act
      clientRequest.destroy()
      await responseClosed.promise

      // Assert
      expect(signal.aborted).toBe(true)
    } finally {
      clientRequest?.destroy()
      const serverClosed = Promise.withResolvers<void>()
      server.close((error) => {
        if (error) {
          serverClosed.reject(error)
        } else {
          serverClosed.resolve()
        }
      })
      await serverClosed.promise
    }
  })

  test("when called repeatedly for the same request, reuses the request signal", () => {
    // Arrange
    const request = createRequest()
    const response = createResponse()

    // Act
    const firstSignal = requestAbortSignal(request, response)
    const secondSignal = requestAbortSignal(request, response)

    // Assert
    expect(secondSignal).toBe(firstSignal)
  })
})
