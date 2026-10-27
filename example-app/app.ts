import { ValidationError } from "@sequelize/core"
import express from "express"
import { BaseApiError, createApiErrorHandler, createApiNotFoundHandler } from "express-light-rail"

import { router } from "@example-app/router.js"

export const app = express()

app.use(express.json())

app.use("/api", (request, _response, next) => {
  const body: unknown = request.body
  if (body === null || Array.isArray(body) || (body !== undefined && typeof body !== "object")) {
    next(new BaseApiError("invalid_input", "Expected a JSON object", {}, 400))
    return
  }

  next()
})

app.use("/api", router)

app.use("/api", createApiNotFoundHandler())

app.use(
  "/api",
  createApiErrorHandler({
    classifyError(error) {
      if (error instanceof ValidationError) {
        return new BaseApiError("invalid_input", "Check the required fields", {}, 400)
      }

      if (
        error instanceof Error &&
        "expose" in error &&
        error.expose === true &&
        "status" in error &&
        typeof error.status === "number" &&
        error.status >= 400 &&
        error.status < 500
      ) {
        return new BaseApiError("invalid_request", "Invalid request", {}, error.status)
      }
    },
  })
)
