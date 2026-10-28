import { extname, resolve } from "node:path"

import { ValidationError } from "@sequelize/core"
import cors from "cors"
import express from "express"
import helmet from "helmet"
import { BaseApiError, createApiErrorHandler, createApiNotFoundHandler } from "express-light-rail"

import { configuration } from "@example-app/configuration.js"
import { StatusController } from "@example-app/controllers/status-controller.js"
import { hoistAuthorizationToken } from "@example-app/middlewares/hoist-authorization-token.js"
import { requestCompletionLogger } from "@example-app/middlewares/request-completion-logger.js"
import {
  jsonBodyParser,
  normalizeFormBody,
  parseBoundedQuery,
  parseMultipartBody,
  urlEncodedBodyParser,
} from "@example-app/middlewares/request-parsers.js"
import { router } from "@example-app/router.js"

export const app = express()

app.set("query parser", parseBoundedQuery)

app.use(requestCompletionLogger)

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        baseUri: ["'self'"],
        connectSrc: ["'self'"],
        defaultSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
      },
    },
  })
)

app.use(
  cors({
    origin: configuration.frontendOrigin,
    credentials: true,
  })
)

app.get("/_status", StatusController.index)

app.use("/api", jsonBodyParser)
app.use("/api", urlEncodedBodyParser)
app.use("/api", parseMultipartBody)
app.use("/api", normalizeFormBody)

app.use("/api", (request, _response, next) => {
  const body: unknown = request.body
  if (body === null || Array.isArray(body) || (body !== undefined && typeof body !== "object")) {
    next(new BaseApiError("invalid_input", "Expected a JSON object", {}, 400))
    return
  }

  next()
})

app.use("/api", hoistAuthorizationToken)
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

app.use(express.static(configuration.webDirectory))

app.use((request, response) => {
  const acceptsHtml = request.accepts("html") !== false
  const isBrowserRoute = request.method === "GET" && acceptsHtml && extname(request.path) === ""

  if (configuration.production && isBrowserRoute) {
    response.sendFile(resolve(configuration.webDirectory, "index.html"), (error) => {
      if (error && !response.headersSent) response.status(404).end()
    })
    return
  }

  if (request.method === "GET" && acceptsHtml) {
    response.status(404).sendFile(resolve(configuration.webDirectory, "404.html"), (error) => {
      if (error && !response.headersSent) response.status(404).end()
    })
    return
  }

  response.sendStatus(404)
})
