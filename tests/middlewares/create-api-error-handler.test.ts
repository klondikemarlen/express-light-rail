import express from "express"
import request from "supertest"

import { BaseApiError } from "@/base-controller/base-api-error.js"

import { createApiErrorHandler } from "@/middlewares/create-api-error-handler.js"

describe("src/middlewares/create-api-error-handler.ts", () => {
  test("when an unknown error occurs, it returns a redacted response", async () => {
    // Arrange
    const app = express()
    app.get("/example", () => {
      throw new Error("database password must not be exposed")
    })
    app.use(createApiErrorHandler())

    // Act
    const response = await request(app).get("/example")

    // Assert
    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: {
        code: "internal_server_error",
        msg: "Internal Server Error",
        meta: {},
      },
    })
  })

  test("when a BaseApiError occurs, it preserves its status and public body", async () => {
    // Arrange
    const app = express()
    app.get("/example", (_request, _response, next) => {
      next(new BaseApiError("invalid_input", "Invalid input", { field: "name" }, 422))
    })
    app.use(createApiErrorHandler())

    // Act
    const response = await request(app).get("/example")

    // Assert
    expect(response.status).toBe(422)
    expect(response.body).toEqual({
      error: {
        code: "invalid_input",
        msg: "Invalid input",
        meta: {
          field: "name",
        },
      },
    })
  })

  test("when the host classifies an error, it returns the host's safe response", async () => {
    // Arrange
    const app = express()
    class HostRequestError extends Error {}

    app.get("/example", (_request, _response, next) => {
      next(new HostRequestError("private database detail"))
    })
    app.use(
      createApiErrorHandler({
        classifyError(error) {
          if (error instanceof HostRequestError) {
            return new BaseApiError("request_rejected", "Request rejected", {}, 400)
          }
        },
      })
    )

    // Act
    const response = await request(app).get("/example")

    // Assert
    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: {
        code: "request_rejected",
        msg: "Request rejected",
        meta: {},
      },
    })
  })

  test("when response headers were sent, it delegates without replacing the response", async () => {
    // Arrange
    const app = express()
    app.get("/example", (_request, response, next) => {
      response.write("response started")
      next(new Error("failure after headers"))
    })
    app.use(createApiErrorHandler())
    app.use(
      (
        _error: unknown,
        _request: express.Request,
        response: express.Response,
        _next: express.NextFunction
      ) => {
        response.end(" and completed")
      }
    )

    // Act
    const response = await request(app).get("/example")

    // Assert
    expect(response.status).toBe(200)
    expect(response.text).toBe("response started and completed")
  })
})
