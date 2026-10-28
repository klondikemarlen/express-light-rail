import type { RequestHandler } from "express"

import { logger } from "@example-app/utils/logger.js"

export const requestLoggerMiddleware: RequestHandler = (request, response, next) => {
  const startedAt = process.hrtime.bigint()
  const pathname = request.path

  response.once("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    logger.info("Request completed", {
      method: request.method,
      pathname,
      status: response.statusCode,
      durationMs,
    })
  })

  next()
}
