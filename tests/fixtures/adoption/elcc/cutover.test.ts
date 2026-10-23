import {
  BaseApiError,
  BaseSerializer,
  BaseService,
  createApiErrorHandler,
} from "express-light-rail"
import express, { Router, type Request } from "express"
import request from "supertest"
import { beforeEach, describe, expect, test } from "vitest"

type Actor = { id: string; canWrite: boolean }
type Owner = { id: string; name: string }
type RecordRow = { id: string; ownerId: string; title: string; owner?: Owner | null }
type RecordJson = { id: string; title: string; owner: { id: string; name: string } }

const owners: Record<string, Owner> = { alice: { id: "alice", name: "Alice" } }
const records: RecordRow[] = []

// Replaces the local copied service base; the host still owns mutation policy and record storage.
class CreateRecordService extends BaseService<Promise<RecordRow>> {
  constructor(
    private readonly actor: Actor,
    private readonly title: string,
    private readonly signal?: AbortSignal
  ) {
    super()
  }

  async perform(): Promise<RecordRow> {
    if (this.signal?.aborted) throw new DOMException("Aborted", "AbortError")
    if (this.title === "explode") throw new Error("Secret failure")
    if (!this.actor.canWrite) throw new BaseApiError("forbidden", "Write denied", {}, 403)

    const record = { id: String(records.length + 1), ownerId: this.actor.id, title: this.title }
    records.push(record)
    return record
  }
}

class RecordSerializer extends BaseSerializer<RecordRow, RecordJson> {
  perform(): RecordJson {
    const owner = this.requiredAssociation(
      this.record.owner,
      "Expected record owner to be preloaded"
    )
    return {
      id: this.record.id,
      title: this.record.title,
      owner: { id: owner.id, name: owner.name },
    }
  }
}

class NoArgumentService extends BaseService<string> {
  perform(): string {
    return "ready"
  }
}

export function assertServiceContracts(): void {
  const inferredSyncResult: string = NoArgumentService.perform()
  const inferredRequiredArgument: Promise<RecordRow> = CreateRecordService.perform(
    { id: "alice", canWrite: true },
    "New plan"
  )
  const inferredOptionalArgument: Promise<RecordRow> = CreateRecordService.perform(
    { id: "alice", canWrite: true },
    "New plan",
    new AbortController().signal
  )
  void inferredOptionalArgument
  void inferredSyncResult
  void inferredRequiredArgument
}

function preloadOwner(record: RecordRow): RecordRow & { owner: Owner } {
  const owner = owners[record.ownerId]
  if (!owner) throw new Error("Expected record owner to be preloaded")
  return { ...record, owner }
}

function appFor(actor: Actor) {
  const app = express()
  app.use(express.json())
  const router = Router()
  router.post("/records", (req: Request, res, next) => {
    void CreateRecordService.perform(actor, String(req.body.title))
      .then((record) =>
        res.status(201).json({ record: RecordSerializer.perform(preloadOwner(record)) })
      )
      .catch(next)
  })
  app.use("/api", router)
  app.use("/api", createApiErrorHandler())
  return app
}

describe("ELCC-shaped service and serializer cutover", () => {
  beforeEach(() => {
    records.splice(0, records.length, { id: "1", ownerId: "alice", title: "Plan" })
  })

  test("when a permitted mutation succeeds, the route serializes its preloaded owner", async () => {
    // Arrange
    const app = appFor({ id: "alice", canWrite: true })

    // Act
    const response = await request(app).post("/api/records").send({ title: "New plan" })

    // Assert
    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      record: { id: "2", title: "New plan", owner: { id: "alice", name: "Alice" } },
    })
  })

  test("when policy denies a mutation, the route returns a safe forbidden response", async () => {
    // Arrange
    const app = appFor({ id: "bob", canWrite: false })

    // Act
    const response = await request(app).post("/api/records").send({ title: "Nope" })

    // Assert
    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: { code: "forbidden", msg: "Write denied", meta: {} } })
  })

  test("when service work fails unexpectedly, the error middleware hides its message", async () => {
    // Arrange
    const app = appFor({ id: "alice", canWrite: true })

    // Act
    const response = await request(app).post("/api/records").send({ title: "explode" })

    // Assert
    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: { code: "internal_server_error", msg: "Internal Server Error", meta: {} },
    })
    expect(JSON.stringify(response.body)).not.toContain("Secret failure")
  })

  test("when a serializer association was not preloaded, serialization fails explicitly", () => {
    // Arrange
    const record = { id: "2", ownerId: "alice", title: "Missing preload" }

    // Act / Assert
    expect(() => RecordSerializer.perform(record)).toThrow("Expected record owner to be preloaded")
  })

  test("when a host-supported signal is already aborted, the service rejects before mutation", async () => {
    // Arrange
    const abort = new AbortController()
    abort.abort()

    // Act / Assert
    await expect(
      CreateRecordService.perform({ id: "alice", canWrite: true }, "Cancelled", abort.signal)
    ).rejects.toMatchObject({
      name: "AbortError",
    })
  })
})
