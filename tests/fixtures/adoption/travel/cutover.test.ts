import {
  BaseApiError,
  BaseController,
  BaseService,
  createApiErrorHandler,
  createApiNotFoundHandler,
} from "express-light-rail"
import express, { Router, type Request } from "express"
import type { Model } from "@sequelize/core"
import request from "supertest"
import { describe, expect, test } from "vitest"

type User = { id: string; canRead: boolean }
type AuthenticatedRequest = Request & { currentUser: User }
type RecordRow = { id: string; ownerId: string; name: string }

const records: RecordRow[] = [{ id: "1", ownerId: "alice", name: "Example" }]

class HostRecordPolicy {
  constructor(
    private readonly user: User,
    private readonly record: RecordRow
  ) {}

  show(): boolean {
    return this.user.canRead && this.record.ownerId === this.user.id
  }
}

// Replaces the application's copied controller base: Express routing, auth, and policy remain host-owned.
abstract class ApplicationController<TModel extends Model = never> extends BaseController<
  TModel,
  AuthenticatedRequest
> {
  protected get currentUser(): User {
    return this.request.currentUser
  }
}

class RecordsController extends ApplicationController<Model> {
  async show(): Promise<void> {
    if (this.params.id === "explode") throw new Error("Secret failure")

    const record = await AsyncLookupService.perform(this.params.id, this.signal)
    if (!new HostRecordPolicy(this.currentUser, record).show()) {
      throw new BaseApiError("forbidden", "Record access denied", {}, 403)
    }
    this.response.json({ record })
  }
}

class AsyncLookupService extends BaseService<Promise<RecordRow>> {
  constructor(
    private readonly recordId: string,
    private readonly signal: AbortSignal,
    private readonly includeArchived = false
  ) {
    super()
  }

  async perform(): Promise<RecordRow> {
    if (this.signal.aborted) throw new DOMException("Aborted", "AbortError")
    if (this.includeArchived) throw new Error("Not found")
    const record = records.find(({ id }) => id === this.recordId)
    if (!record) throw new BaseApiError("not_found", "Record not found", {}, 404)
    return record
  }
}

export function assertServiceContracts(): void {
  const asyncResult: Promise<RecordRow> = AsyncLookupService.perform(
    "1",
    new AbortController().signal
  )
  const optionalResult: Promise<RecordRow> = AsyncLookupService.perform(
    "1",
    new AbortController().signal,
    false
  )
  void asyncResult
  void optionalResult
}

function appFor(user: User) {
  const app = express()
  const router = Router()
  router.use((req, _res, next) => {
    Object.assign(req, { currentUser: user })
    next()
  })
  router.get("/records/:id", RecordsController.show)
  app.use("/api", router)
  app.use("/api", createApiNotFoundHandler())
  app.use("/api", createApiErrorHandler())
  return app
}

describe("Travel-shaped controller cutover", () => {
  test("when no host signal wrapper is installed, the inherited signal reaches the service", async () => {
    // Arrange
    const app = appFor({ id: "alice", canRead: true })

    // Act
    const response = await request(app).get("/api/records/1")

    // Assert
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ record: { id: "1", ownerId: "alice", name: "Example" } })
  })

  test("when the current user is denied, the route returns a policy error", async () => {
    // Arrange
    const app = appFor({ id: "bob", canRead: true })

    // Act
    const response = await request(app).get("/api/records/1")

    // Assert
    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      error: { code: "forbidden", msg: "Record access denied", meta: {} },
    })
  })

  test("when the requested record is missing, the route preserves its not-found response", async () => {
    // Arrange
    const app = appFor({ id: "alice", canRead: true })

    // Act
    const response = await request(app).get("/api/records/missing")

    // Assert
    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      error: {
        code: "not_found",
        msg: "Record not found",
        meta: {},
      },
    })
  })

  test("when an action throws unexpectedly, the error middleware hides its message", async () => {
    // Arrange
    const app = appFor({ id: "alice", canRead: true })

    // Act
    const response = await request(app).get("/api/records/explode")

    // Assert
    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: { code: "internal_server_error", msg: "Internal Server Error", meta: {} },
    })
  })

  test("when the service is called, its async result and optional argument are preserved", async () => {
    // Arrange
    const service = AsyncLookupService

    // Act
    const result = await service.perform("1", new AbortController().signal, false)

    // Assert
    expect(result).toEqual({ id: "1", ownerId: "alice", name: "Example" })
  })
})
