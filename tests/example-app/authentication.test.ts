import { generateKeyPairSync, sign, type KeyObject } from "node:crypto"
import { once } from "node:events"
import { createServer } from "node:http"

import type { Sequelize } from "@sequelize/core"
import type { Express } from "express"
import type { FactoryInterface } from "factory-shark"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"

import type { User } from "@example-app/models/user.js"

let application: Express
let database: Sequelize
let userFactory: FactoryInterface<User>
let issuerBaseURL: string

const signingKeys = generateKeyPairSync("rsa", {
  modulusLength: 2048,
})
const publicKey = signingKeys.publicKey.export({
  format: "jwk",
})
const environmentKeys = [
  "EXAMPLE_AUTH_MODE",
  "EXAMPLE_DATABASE_STORAGE",
  "AUTH0_ISSUER_BASE_URL",
  "AUTH0_AUDIENCE",
  "AUTH0_SUBJECT_USERS",
]
const previousEnvironment = new Map<string, string | undefined>()

const identityServer = createServer((incoming, response) => {
  response.setHeader("Content-Type", "application/json")
  if (incoming.url === "/.well-known/openid-configuration") {
    response.end(
      JSON.stringify({
        issuer: issuerBaseURL,
        jwks_uri: `${issuerBaseURL}.well-known/jwks.json`,
      })
    )
    return
  }

  if (incoming.url === "/.well-known/jwks.json") {
    response.end(
      JSON.stringify({
        keys: [
          {
            ...publicKey,
            kid: "example-signing-key",
            alg: "RS256",
            use: "sig",
          },
        ],
      })
    )
    return
  }

  response.statusCode = 404
  response.end("{}")
})

beforeAll(async () => {
  identityServer.listen(0, "127.0.0.1")
  await once(identityServer, "listening")
  const address = identityServer.address()
  if (!address || typeof address === "string") throw new Error("Identity server did not bind TCP")
  issuerBaseURL = `http://127.0.0.1:${address.port}/`

  for (const key of environmentKeys) previousEnvironment.set(key, process.env[key])
  process.env.EXAMPLE_AUTH_MODE = "auth0"
  process.env.EXAMPLE_DATABASE_STORAGE = ":memory:"
  process.env.AUTH0_ISSUER_BASE_URL = issuerBaseURL
  process.env.AUTH0_AUDIENCE = "discussion-board-api"
  process.env.AUTH0_SUBJECT_USERS = JSON.stringify({
    "auth0|alice": "alice",
  })

  // Load the application after binding the test issuer: configuration is captured at module startup.
  database = (await import("@example-app/database.js")).sequelize
  userFactory = (await import("@tests/example-app/factories/user-factory.js")).userFactory
  application = (await import("@example-app/app.js")).app
})

beforeEach(async () => {
  await database.sync({ force: true })
})

afterAll(async () => {
  await database?.close()
  const closed = once(identityServer, "close")
  identityServer.close()
  await closed

  for (const [key, value] of previousEnvironment) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

function accessToken(
  overrides: Record<string, unknown> = {},
  key: KeyObject = signingKeys.privateKey
): string {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT",
      kid: "example-signing-key",
    })
  ).toString("base64url")
  const payload = Buffer.from(
    JSON.stringify({
      iss: issuerBaseURL,
      aud: "discussion-board-api",
      sub: "auth0|alice",
      iat: now,
      exp: now + 300,
      ...overrides,
    })
  ).toString("base64url")
  const content = `${header}.${payload}`
  return `${content}.${sign("RSA-SHA256", Buffer.from(content), key).toString("base64url")}`
}

describe("Auth0 application-controller authentication", () => {
  test("when a verified subject is mapped, uses its local account instead of a demo header", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "alice",
      name: "Alice",
    })
    const token = accessToken()
    const route = request(application)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .set("x-user-id", "bob")

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      users: [
        {
          id: author.id,
          username: "alice",
          name: "Alice",
        },
      ],
    })
  })

  test("when only a demo header is provided in Auth0 mode, denies access", async () => {
    // Arrange
    await userFactory.create({
      username: "alice",
    })
    const route = request(application).get("/api/users").set("x-user-id", "alice")

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: {
        code: "unauthorized",
        msg: "Authentication required",
        meta: {},
      },
    })
  })

  test("when only a query token is supplied, denies access", async () => {
    // Arrange
    await userFactory.create({ username: "alice" })
    const route = request(application).get("/api/users").query({ access_token: accessToken() })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: { code: "unauthorized", msg: "Authentication required", meta: {} },
    })
  })

  test("when the token has another audience, denies access", async () => {
    // Arrange
    const token = accessToken({
      aud: "another-api",
    })
    const route = request(application).get("/api/users").set("Authorization", `Bearer ${token}`)

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: {
        code: "unauthorized",
        msg: "Authentication required",
        meta: {},
      },
    })
  })

  test("when the token has another issuer, denies access", async () => {
    // Arrange
    const token = accessToken({
      iss: "https://another-issuer.example/",
    })
    const route = request(application).get("/api/users").set("Authorization", `Bearer ${token}`)

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: {
        code: "unauthorized",
        msg: "Authentication required",
        meta: {},
      },
    })
  })

  test("when the token has expired, denies access", async () => {
    // Arrange
    const token = accessToken({
      exp: Math.floor(Date.now() / 1000) - 120,
    })
    const route = request(application).get("/api/users").set("Authorization", `Bearer ${token}`)

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: {
        code: "unauthorized",
        msg: "Authentication required",
        meta: {},
      },
    })
  })

  test("when a token is signed by an untrusted key, denies access", async () => {
    // Arrange
    const untrustedKeys = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    })
    const token = accessToken({}, untrustedKeys.privateKey)
    const route = request(application).get("/api/users").set("Authorization", `Bearer ${token}`)

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: {
        code: "unauthorized",
        msg: "Authentication required",
        meta: {},
      },
    })
  })

  test("when a verified subject has no local binding, denies access", async () => {
    // Arrange
    const token = accessToken({
      sub: "auth0|unmapped",
    })
    const route = request(application).get("/api/users").set("Authorization", `Bearer ${token}`)

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      error: {
        code: "forbidden",
        msg: "Account is not provisioned",
        meta: {},
      },
    })
  })

  test("when a form carries a bearer token, authenticates its configured author", async () => {
    // Arrange
    const author = await userFactory.create({
      username: "alice",
    })
    const token = accessToken()
    const route = request(application).post("/api/threads").type("form").send({
      title: "Authenticated form",
      body: "Submitted with a verified access token",
      HOISTABLE_AUTHORIZATION_TOKEN: token,
    })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      thread: {
        id: 1,
        authorId: author.id,
        title: "Authenticated form",
        body: "Submitted with a verified access token",
      },
    })
  })

  test("when the authorization header is invalid, a valid body token cannot replace it", async () => {
    // Arrange
    const token = accessToken()
    const route = request(application)
      .post("/api/threads")
      .set("Authorization", "Bearer invalid")
      .type("form")
      .send({
        title: "Must not be created",
        body: "Header credentials take precedence",
        HOISTABLE_AUTHORIZATION_TOKEN: token,
      })

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: {
        code: "unauthorized",
        msg: "Authentication required",
        meta: {},
      },
    })
  })
})
