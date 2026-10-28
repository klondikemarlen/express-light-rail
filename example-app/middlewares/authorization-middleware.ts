import { BaseApiError } from "express-light-rail"
import type { NextFunction, Request, Response } from "express"
import { errors, jwtVerify } from "jose"

import {
  JWT_AUDIENCE,
  JWT_EXPIRATION_SECONDS,
  JWT_ISSUER,
  JWT_SECRET,
} from "@example-app/config.js"
import type { User } from "@example-app/models/user.js"
import { LoadCurrentUserService } from "@example-app/services/users/index.js"

const signingKey = new TextEncoder().encode(JWT_SECRET)

export async function authorizationMiddleware(
  request: Request,
  _response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authorization = request.get("authorization")
    const bearer = authorization?.match(/^Bearer ([^\s]+)$/i)
    if (!bearer) throw new BaseApiError("unauthorized", "Authentication required", {}, 401)

    const { payload } = await jwtVerify(bearer[1], signingKey, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      requiredClaims: ["sub", "iat", "exp"],
      maxTokenAge: JWT_EXPIRATION_SECONDS,
    })
    const authenticatedRequest: Request & { currentUser?: User } = request
    authenticatedRequest.currentUser = await LoadCurrentUserService.perform(payload.sub)
    next()
  } catch (error: unknown) {
    if (error instanceof errors.JOSEError) {
      next(new BaseApiError("unauthorized", "Authentication required", {}, 401))
      return
    }

    next(error)
  }
}
