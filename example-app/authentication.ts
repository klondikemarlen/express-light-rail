import { UnauthorizedError, auth } from "express-oauth2-jwt-bearer"
import { BaseApiError } from "express-light-rail"
import type { Handler, Request, Response } from "express"

import { configuration } from "@example-app/configuration.js"
import { User } from "@example-app/models/user.js"

let auth0Middleware: Handler | undefined
if (configuration.authentication.mode === "auth0") {
  auth0Middleware = auth({
    issuerBaseURL: configuration.authentication.issuerBaseURL,
    audience: configuration.authentication.audience,
    tokenSigningAlg: "RS256",
  })
}

export async function authenticateUser(request: Request, response: Response): Promise<User> {
  if (configuration.authentication.mode === "demo") {
    const username = request.get("x-user-id")
    if (!username) throw authenticationRequired()

    const user = await User.findOne({
      where: {
        username,
      },
    })
    if (!user) throw authenticationRequired()
    return user
  }

  if (!request.get("authorization")) throw authenticationRequired()

  if (!auth0Middleware) throw new Error("Auth0 authentication middleware is not configured")

  const subject = await verifyAuth0Subject(auth0Middleware, request, response)
  if (!subject) throw accountNotProvisioned()

  const username = configuration.authentication.subjectUsers.get(subject)
  if (!username) throw accountNotProvisioned()

  const user = await User.findOne({
    where: {
      username,
    },
  })
  if (!user) throw accountNotProvisioned()
  return user
}

async function verifyAuth0Subject(
  middleware: Handler,
  request: Request,
  response: Response
): Promise<string | undefined> {
  try {
    return await new Promise<string | undefined>((resolve, reject) => {
      middleware(request, response, (error?: unknown) => {
        if (error) {
          reject(error)
          return
        }

        resolve(request.auth?.payload.sub)
      })
    })
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) throw authenticationRequired()
    throw error
  }
}

function authenticationRequired(): BaseApiError {
  return new BaseApiError("unauthorized", "Authentication required", {}, 401)
}

function accountNotProvisioned(): BaseApiError {
  return new BaseApiError("forbidden", "Account is not provisioned", {}, 403)
}
