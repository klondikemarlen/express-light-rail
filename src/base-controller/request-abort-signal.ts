import type { Request, Response } from "express"

export function requestAbortSignal(request: Request, response: Response): AbortSignal {
  const signalRequest: Request & { signal?: unknown } = request
  const existingSignal = signalRequest.signal

  if (existingSignal instanceof AbortSignal) {
    return existingSignal
  }

  const controller = new AbortController()
  const { signal } = controller

  signalRequest.signal = signal

  if (response.writableFinished) {
    return signal
  }

  if (request.aborted || response.destroyed) {
    controller.abort()
    return signal
  }

  function cleanup() {
    request.removeListener("aborted", abort)
    response.removeListener("close", abort)
    response.removeListener("finish", cleanup)
  }

  function abort() {
    cleanup()
    if (!response.writableFinished) {
      controller.abort()
    }
  }

  request.once("aborted", abort)
  response.once("close", abort)
  response.once("finish", cleanup)

  return signal
}
