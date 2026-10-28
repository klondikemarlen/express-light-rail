import { randomBytes } from "node:crypto"
import { resolve } from "node:path"

export const NODE_ENV = process.env.NODE_ENV || "development"
export const IS_PRODUCTION = NODE_ENV === "production"
export const API_PORT = Number(process.env.API_PORT ?? 3000)
export const DATABASE_HOST = process.env.DB_HOST || "localhost"
export const DATABASE_PORT = Number(process.env.DB_PORT ?? 1433)
export const DATABASE_NAME = process.env.DB_NAME || "express_light_rail_development"
export const DATABASE_USERNAME = process.env.DB_USER || "sa"
export const DATABASE_PASSWORD = process.env.DB_PASS || ""
export const DATABASE_TRUST_SERVER_CERTIFICATE = NODE_ENV === "development" || NODE_ENV === "test"
export const DEFAULT_LOG_LEVEL = process.env.EXAMPLE_LOG_LEVEL || "info"
export const FRONTEND_ORIGIN = new URL(process.env.FRONTEND_URL || "http://localhost:3000").origin
export const WEB_DIRECTORY = resolve(process.env.EXAMPLE_WEB_DIRECTORY || "example-app/web")

let signingSecret = process.env.EXAMPLE_JWT_SECRET
if (!signingSecret) {
  if (IS_PRODUCTION) throw new Error("Production requires EXAMPLE_JWT_SECRET")

  signingSecret = randomBytes(32).toString("base64url")
}
if (Buffer.byteLength(signingSecret) < 32) {
  throw new Error("EXAMPLE_JWT_SECRET must contain at least 32 bytes")
}

export const JWT_SECRET = signingSecret
export const JWT_ISSUER = "discussion-board"
export const JWT_AUDIENCE = "discussion-board-api"
export const JWT_EXPIRATION_SECONDS = 900
