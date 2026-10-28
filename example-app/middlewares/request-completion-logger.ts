import type { RequestHandler } from "express"

import { logger } from "@example-app/logger.js"

export const requestCompletionLogger: RequestHandler = (request, response, next) => {
  const startedAt = process.hrtime.bigint()

  response.once("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    logger.info("Request completed", {
      method: request.method,
      pathname: request.path,
      status: response.statusCode,
      durationMs,
    })
  })

  next()
}
