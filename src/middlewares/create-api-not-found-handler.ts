import { type RequestHandler } from "express"

export function createApiNotFoundHandler(): RequestHandler {
  return (_request, response) => {
    return response.status(404).json({
      error: {
        code: "not_found",
        msg: "Not Found",
        meta: {},
      },
    })
  }
}
