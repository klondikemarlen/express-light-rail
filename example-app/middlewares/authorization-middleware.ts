import { UnauthorizedError, auth } from "express-oauth2-jwt-bearer"
import { BaseApiError } from "express-light-rail"
import type { Handler, NextFunction, Request, Response } from "express"

import { AUTHENTICATION_MODE, AUTH0_AUDIENCE, AUTH0_ISSUER_BASE_URL } from "@example-app/config.js"

let tokenMiddleware: Handler | undefined
if (AUTHENTICATION_MODE === "auth0") {
  tokenMiddleware = auth({
    issuerBaseURL: AUTH0_ISSUER_BASE_URL,
    audience: AUTH0_AUDIENCE,
    tokenSigningAlg: "RS256",
  })
}

export function authorizationMiddleware(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  if (AUTHENTICATION_MODE === "demo") {
    next()
    return
  }

  if (!request.get("authorization")) {
    next(new BaseApiError("unauthorized", "Authentication required", {}, 401))
    return
  }

  if (!tokenMiddleware) throw new Error("Auth0 token middleware is not configured")

  tokenMiddleware(request, response, (error?: unknown) => {
    if (error instanceof UnauthorizedError) {
      next(new BaseApiError("unauthorized", "Authentication required", {}, 401))
      return
    }

    next(error)
  })
}
