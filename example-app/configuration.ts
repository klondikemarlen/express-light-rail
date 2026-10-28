import { resolve } from "node:path"

export type AuthenticationConfiguration =
  | { mode: "demo" }
  | {
      mode: "auth0"
      issuerBaseURL: string
      audience: string
      subjectUsers: ReadonlyMap<string, string>
    }

export function loadConfiguration(environment: NodeJS.ProcessEnv = process.env) {
  const production = environment.NODE_ENV === "production"
  const mode = environment.EXAMPLE_AUTH_MODE || (production ? "auth0" : "demo")
  let authentication: AuthenticationConfiguration

  if (mode === "demo") {
    if (production) throw new Error("Demo authentication is not allowed in production")
    authentication = { mode: "demo" }
  } else if (mode === "auth0") {
    const issuerBaseURL = environment.AUTH0_ISSUER_BASE_URL
    const audience = environment.AUTH0_AUDIENCE
    if (!issuerBaseURL || !audience) {
      throw new Error("Auth0 mode requires AUTH0_ISSUER_BASE_URL and AUTH0_AUDIENCE")
    }

    const issuer = new URL(issuerBaseURL)
    const localIssuer = issuer.hostname === "localhost" || issuer.hostname === "127.0.0.1"
    if (
      issuer.protocol !== "https:" &&
      !(issuer.protocol === "http:" && localIssuer && !production)
    ) {
      throw new Error("Auth0 issuers must use HTTPS; local development issuers may use HTTP")
    }

    const bindings: unknown = JSON.parse(environment.AUTH0_SUBJECT_USERS || "{}")
    if (!bindings || typeof bindings !== "object" || Array.isArray(bindings)) {
      throw new Error("AUTH0_SUBJECT_USERS must map verified subjects to local usernames")
    }

    const subjectUsers = new Map<string, string>()
    const entries: [string, unknown][] = Object.entries(bindings)
    for (const [subject, username] of entries) {
      if (!subject || typeof username !== "string" || !username.trim()) {
        throw new Error("AUTH0_SUBJECT_USERS entries require a subject and local username")
      }
      subjectUsers.set(subject, username)
    }

    authentication = {
      mode: "auth0",
      issuerBaseURL,
      audience,
      subjectUsers,
    }
  } else {
    throw new Error("EXAMPLE_AUTH_MODE must be demo or auth0")
  }

  return {
    authentication,
    production,
    frontendOrigin: new URL(environment.FRONTEND_URL || "http://localhost:3000").origin,
    webDirectory: resolve(environment.EXAMPLE_WEB_DIRECTORY || "example-app/web"),
  }
}

export const configuration = loadConfiguration()
