import { resolve } from "node:path"

export const NODE_ENV = process.env.NODE_ENV || "development"
export const IS_PRODUCTION = NODE_ENV === "production"
export const API_PORT = Number(process.env.API_PORT ?? 3000)
export const DATABASE_STORAGE =
  process.env.EXAMPLE_DATABASE_STORAGE || resolve(".example-app/discussion-board.sqlite")
export const DEFAULT_LOG_LEVEL = process.env.EXAMPLE_LOG_LEVEL || "info"
export const FRONTEND_ORIGIN = new URL(process.env.FRONTEND_URL || "http://localhost:3000").origin
export const WEB_DIRECTORY = resolve(process.env.EXAMPLE_WEB_DIRECTORY || "example-app/web")

const mode = process.env.EXAMPLE_AUTH_MODE || (IS_PRODUCTION ? "auth0" : "demo")
if (mode !== "demo" && mode !== "auth0") {
  throw new Error("EXAMPLE_AUTH_MODE must be demo or auth0")
}
if (mode === "demo" && IS_PRODUCTION) {
  throw new Error("Demo authentication is not allowed in production")
}

export const AUTHENTICATION_MODE = mode

let auth0IssuerBaseURL = ""
let auth0Audience = ""
const subjectUsers = new Map<string, string>()

if (AUTHENTICATION_MODE === "auth0") {
  auth0IssuerBaseURL = process.env.AUTH0_ISSUER_BASE_URL || ""
  auth0Audience = process.env.AUTH0_AUDIENCE || ""
  if (!auth0IssuerBaseURL || !auth0Audience) {
    throw new Error("Auth0 mode requires AUTH0_ISSUER_BASE_URL and AUTH0_AUDIENCE")
  }

  const issuer = new URL(auth0IssuerBaseURL)
  const localIssuer = issuer.hostname === "localhost" || issuer.hostname === "127.0.0.1"
  if (
    issuer.protocol !== "https:" &&
    !(issuer.protocol === "http:" && localIssuer && !IS_PRODUCTION)
  ) {
    throw new Error("Auth0 issuers must use HTTPS; local development issuers may use HTTP")
  }

  const bindings: unknown = JSON.parse(process.env.AUTH0_SUBJECT_USERS || "{}")
  if (!bindings || typeof bindings !== "object" || Array.isArray(bindings)) {
    throw new Error("AUTH0_SUBJECT_USERS must map verified subjects to local usernames")
  }

  const entries: [string, unknown][] = Object.entries(bindings)
  for (const [subject, username] of entries) {
    if (!subject || typeof username !== "string" || !username.trim()) {
      throw new Error("AUTH0_SUBJECT_USERS entries require a subject and local username")
    }
    subjectUsers.set(subject, username)
  }
}

export const AUTH0_ISSUER_BASE_URL = auth0IssuerBaseURL
export const AUTH0_AUDIENCE = auth0Audience
export const AUTH0_SUBJECT_USERS: ReadonlyMap<string, string> = subjectUsers
