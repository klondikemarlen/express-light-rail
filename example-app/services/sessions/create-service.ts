import { BaseService } from "express-light-rail"
import { SignJWT } from "jose"

import {
  JWT_AUDIENCE,
  JWT_EXPIRATION_SECONDS,
  JWT_ISSUER,
  JWT_SECRET,
} from "@example-app/config.js"
import { AuthenticateService } from "@example-app/services/users/index.js"

export type SessionCredentials = {
  username: unknown
  password: unknown
}

export type SessionAsCreate = {
  accessToken: string
  tokenType: "Bearer"
  expiresIn: number
}

const signingKey = new TextEncoder().encode(JWT_SECRET)

export class CreateService extends BaseService<Promise<SessionAsCreate>> {
  constructor(private readonly credentials: SessionCredentials) {
    super()
  }

  async perform(): Promise<SessionAsCreate> {
    const user = await AuthenticateService.perform(this.credentials)
    const accessToken = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(String(user.id))
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${JWT_EXPIRATION_SECONDS}s`)
      .sign(signingKey)

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: JWT_EXPIRATION_SECONDS,
    }
  }
}
