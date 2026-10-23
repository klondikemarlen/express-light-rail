import { type ErrorRequestHandler, type Request } from "express"

import { BaseApiError } from "@/base-controller/base-api-error.js"

export type ApiErrorHandlerOptions = {
  classifyError?: (error: unknown, request: Request) => BaseApiError | undefined
  onError?: (error: unknown, request: Request) => void
}

export function createApiErrorHandler(
  options: ApiErrorHandlerOptions = {}
): ErrorRequestHandler {
  return (error: unknown, request, response, next) => {
    if (response.headersSent) {
      return next(error)
    }

    options.onError?.(error, request)

    const classifiedError = options.classifyError?.(error, request)
    if (classifiedError) {
      return response.status(classifiedError.statusCode).json(classifiedError.toJSON())
    }

    if (error instanceof BaseApiError) {
      return response.status(error.statusCode).json(error.toJSON())
    }

    return response.status(500).json({
      error: {
        code: "internal_server_error",
        msg: "Internal Server Error",
        meta: {},
      },
    })
  }
}
