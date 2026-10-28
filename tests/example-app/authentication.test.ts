import { jwtVerify, SignJWT } from "jose"
import type { Sequelize } from "@sequelize/core"
import type { Express } from "express"
import type { FactoryInterface } from "factory-shark"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"

import type { User } from "@example-app/models/user.js"
import { hashPassword } from "@example-app/utils/password.js"

let application: Express
let database: Sequelize
let userFactory: FactoryInterface<User>
let jwtSecret: string
let jwtIssuer: string
let jwtAudience: string

const environmentKeys = ["EXAMPLE_DATABASE_STORAGE", "EXAMPLE_JWT_SECRET"]
const previousEnvironment = new Map<string, string | undefined>()
const testPassword = "test-password"

beforeAll(async () => {
  for (const key of environmentKeys) previousEnvironment.set(key, process.env[key])
  process.env.EXAMPLE_DATABASE_STORAGE = ":memory:"
  process.env.EXAMPLE_JWT_SECRET = "test-secret-with-at-least-thirty-two-bytes"

  // Load runtime configuration after setting isolated test environment values.
  const config = await import("@example-app/config.js")
  jwtSecret = config.JWT_SECRET
  jwtIssuer = config.JWT_ISSUER
  jwtAudience = config.JWT_AUDIENCE
  database = (await import("@example-app/models/index.js")).db
  userFactory = (await import("@tests/example-app/factories/user-factory.js")).userFactory
  application = (await import("@example-app/app.js")).app
})

beforeEach(async () => {
  await database.sync({ force: true })
})

afterAll(async () => {
  await database?.close()
  for (const [key, value] of previousEnvironment) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

async function signedToken(
  claims: { aud?: string; iss?: string; exp?: number; sub?: string } = {},
  secret = jwtSecret
): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub ?? "1")
    .setIssuer(claims.iss ?? jwtIssuer)
    .setAudience(claims.aud ?? jwtAudience)
    .setIssuedAt()
    .setExpirationTime(claims.exp ?? "15m")
    .sign(key)
}

async function login(username: string) {
  return request(application).post("/api/session").send({
    username,
    password: testPassword,
  })
}

describe("local session authentication", () => {
  test("when credentials are valid, returns a signed bearer token without credentials", async () => {
    // Arrange
    const user = await userFactory.create({
      username: "alice",
    })

    // Act
    const response = await login(user.username)

    // Assert
    expect(response.status).toBe(201)
    expect(response.headers["cache-control"]).toBe("no-store")
    expect(response.body).toEqual({
      accessToken: expect.any(String),
      tokenType: "Bearer",
      expiresIn: 900,
    })
    const { payload, protectedHeader } = await jwtVerify(
      response.body.accessToken,
      new TextEncoder().encode(jwtSecret),
      {
        issuer: jwtIssuer,
        audience: jwtAudience,
        algorithms: ["HS256"],
      }
    )
    expect(protectedHeader.alg).toBe("HS256")
    expect(payload).toMatchObject({
      sub: String(user.id),
      iss: jwtIssuer,
      aud: jwtAudience,
    })
    expect(payload.exp).toBeTypeOf("number")
    expect(payload.iat).toBeTypeOf("number")
    expect(payload.exp! - payload.iat!).toBe(900)
  })

  test.each(["URL-encoded", "multipart"])(
    "when %s credentials look like booleans, preserves their exact strings",
    async (format) => {
      // Arrange
      await userFactory.create({
        username: "true",
        passwordHash: await hashPassword("false"),
      })
      const route = request(application).post("/api/session")
      if (format === "URL-encoded") {
        route.type("form").send({ username: "true", password: "false" })
      } else {
        route.field("username", "true").field("password", "false")
      }

      // Act
      const response = await route

      // Assert
      expect(response.status).toBe(201)
      expect(response.body).toEqual({
        accessToken: expect.any(String),
        tokenType: "Bearer",
        expiresIn: 900,
      })
    }
  )

  test.each([
    ["wrong password", "alice", "incorrect-password"],
    ["unknown username", "unknown", testPassword],
  ])("when %s is submitted, rejects credentials generically", async (_, username, password) => {
    // Arrange
    await userFactory.create({
      username: "alice",
    })

    // Act
    const response = await request(application).post("/api/session").send({ username, password })

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: {
        code: "unauthorized",
        msg: "Invalid username or password",
        meta: {},
      },
    })
  })

  test.each([{}, { username: "alice" }, { password: testPassword }])(
    "when login credentials are missing (%o), rejects the request",
    async (credentials) => {
      // Arrange

      // Act
      const response = await request(application).post("/api/session").send(credentials)

      // Assert
      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        error: {
          code: "invalid_input",
          msg: "Username and password are required",
          meta: {},
        },
      })
    }
  )

  test("when a login token authenticates a request, returns the current user's resource identity", async () => {
    // Arrange
    const user = await userFactory.create({
      username: "alice",
      name: "Alice",
    })
    const loginResponse = await login(user.username)
    const route = request(application)
      .get("/api/users")
      .set("Authorization", `Bearer ${loginResponse.body.accessToken}`)

    // Act
    const response = await route

    // Assert
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      users: [{ id: user.id, username: "alice", name: "Alice" }],
    })
  })

  test("when only the old identity header is supplied, denies access", async () => {
    // Arrange
    await userFactory.create({ username: "alice" })

    // Act
    const response = await request(application).get("/api/users").set("x-user-id", "alice")

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: { code: "unauthorized", msg: "Authentication required", meta: {} },
    })
  })

  test("when only a query token is supplied, denies access", async () => {
    // Arrange
    await userFactory.create({ username: "alice" })
    const token = await signedToken()

    // Act
    const response = await request(application).get("/api/users").query({ access_token: token })

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: { code: "unauthorized", msg: "Authentication required", meta: {} },
    })
  })

  test.each([
    ["expired", { exp: Math.floor(Date.now() / 1000) - 120 }],
    ["wrong audience", { aud: "another-api" }],
    ["wrong issuer", { iss: "another-issuer" }],
  ])("when a %s token is supplied, denies access", async (_, claims) => {
    // Arrange
    await userFactory.create({ username: "alice" })
    const token = await signedToken(claims)

    // Act
    const response = await request(application)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`)

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: { code: "unauthorized", msg: "Authentication required", meta: {} },
    })
  })

  test("when a token is signed with an untrusted secret, denies access", async () => {
    // Arrange
    await userFactory.create({ username: "alice" })
    const token = await signedToken({}, "different-secret-with-at-least-thirty-two-bytes")

    // Act
    const response = await request(application)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`)

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: { code: "unauthorized", msg: "Authentication required", meta: {} },
    })
  })

  test("when a token belongs to a deleted user, denies access", async () => {
    // Arrange
    const user = await userFactory.create({ username: "alice" })
    const loginResponse = await login(user.username)
    await user.destroy()

    // Act
    const response = await request(application)
      .get("/api/users")
      .set("Authorization", `Bearer ${loginResponse.body.accessToken}`)

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: { code: "unauthorized", msg: "Authentication required", meta: {} },
    })
  })

  test("when a token is supplied in the request body, denies access", async () => {
    // Arrange
    await userFactory.create({ username: "alice" })
    const token = await signedToken()

    // Act
    const response = await request(application).post("/api/threads").type("form").send({
      title: "Must not be created",
      body: "Body credentials are not accepted",
      HOISTABLE_AUTHORIZATION_TOKEN: token,
    })

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: { code: "unauthorized", msg: "Authentication required", meta: {} },
    })
  })
})
