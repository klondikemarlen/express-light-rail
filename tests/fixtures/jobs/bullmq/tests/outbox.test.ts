import { DataTypes, Model, Sequelize } from "@sequelize/core"
import { SqliteDialect } from "@sequelize/sqlite3"
import { Queue, QueueEvents } from "bullmq"
import { afterAll, afterEach, beforeEach, describe, expect, test } from "vitest"

import { BaseJob, type JobPayload } from "express-light-rail"

import {
  createBullMQJobBackend,
  createBullMQJobWorker,
  JobRegistry,
  JobSkippedError,
} from "express-light-rail/jobs/bullmq"

type RecordAttributes = { id: number; value: string }
class DomainRecord extends Model<RecordAttributes, { value: string }> {
  declare id: number
  declare value: string
}

type OutboxAttributes = {
  id: number
  queueName: string
  jobName: string
  jobData: unknown[]
  status: string
}
class OutboxRecord extends Model<OutboxAttributes, Omit<OutboxAttributes, "id">> {
  declare id: number
  declare queueName: string
  declare jobName: string
  declare jobData: unknown[]
  declare status: string
}

const sequelize = new Sequelize({
  dialect: SqliteDialect,
  storage: ":memory:",
  logging: false,
  pool: { max: 1, idle: Infinity, maxUses: Infinity },
})
DomainRecord.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, tableName: "domain_records", timestamps: false }
)
OutboxRecord.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    queueName: { type: DataTypes.STRING, allowNull: false },
    jobName: { type: DataTypes.STRING, allowNull: false },
    jobData: { type: DataTypes.JSON, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, tableName: "outbox_records", timestamps: false }
)

const redisUrl = process.env.REDIS_URL
if (!redisUrl) throw new Error("REDIS_URL must point to disposable Redis")

const redisConnection = new URL(redisUrl)
const redisOptions = {
  host: redisConnection.hostname,
  port: Number(redisConnection.port || 6379),
  db: Number(redisConnection.pathname.slice(1) || 0),
}
const cleanup: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close()
})
afterAll(async () => {
  await sequelize.close()
})

async function createQueue(queueName: string, prefix = `consumer-${crypto.randomUUID()}`) {
  const queue = new Queue<JobPayload, unknown, string>(queueName, {
    connection: redisOptions,
    prefix,
  })
  const events = new QueueEvents(queueName, { connection: redisOptions, prefix })
  await Promise.all([queue.waitUntilReady(), events.waitUntilReady()])
  cleanup.push(async () => {
    await events.close()
    await queue.obliterate({ force: true })
    await queue.close()
  })
  return { queue, events, prefix }
}

async function startWorker(
  queueName: string,
  registry: JobRegistry,
  prefix: string,
  concurrency = 1,
  hooks?: Parameters<typeof createBullMQJobWorker>[3]
) {
  const worker = createBullMQJobWorker(
    queueName,
    registry,
    { connection: redisOptions, prefix, concurrency },
    hooks
  )
  await worker.waitUntilReady()
  const running = worker.run()
  cleanup.push(async () => {
    await worker.close()
    await running
  })
}

class ProcessRecordJob extends BaseJob<Promise<string>> {
  static override jobName = "record-process-v2"

  constructor(
    private readonly record: DomainRecord,
    private readonly suffix: string
  ) {
    super()
  }

  override async perform(): Promise<string> {
    this.record.value = `${this.record.value}:${this.suffix}`
    await this.record.save()
    return this.record.value
  }
}

function registryForRecord() {
  const registry = new JobRegistry()
  registry.register(ProcessRecordJob, {
    async deserialize(id, suffix) {
      const record = await DomainRecord.findByPk(Number(id))
      if (!record) throw new JobSkippedError("record no longer exists")

      return [record, String(suffix)]
    },
  })
  return registry
}

const recordArgumentSerializer = {
  serialize(...args: unknown[]) {
    const [record, suffix] = args
    if (!(record instanceof DomainRecord) || typeof suffix !== "string") {
      throw new TypeError("Expected a model and suffix")
    }
    return [record.id, suffix]
  },
}

describe("installed BullMQ consumer", () => {
  describe("model decoding and host outbox", () => {
    beforeEach(async () => {
      await sequelize.sync({ force: true })
      ProcessRecordJob.configure({ argumentSerializer: recordArgumentSerializer })
    })

    test("when a serialized model reference runs, persists the deserialized model mutation", async () => {
      // Arrange
      const record = await DomainRecord.create({ value: "before" })
      const { queue, prefix } = await createQueue("records")
      const registry = registryForRecord()
      const backend = createBullMQJobBackend(registry, new Map([["records", queue]]))
      const completion = Promise.withResolvers<void>()
      await startWorker("records", registry, prefix, 1, {
        onCompleted: () => completion.resolve(),
      })

      // Act
      await ProcessRecordJob.withBackend(backend).queueAs("records").performLater(record, "after")
      await completion.promise

      // Assert
      const reloaded = await record.reload()
      expect(reloaded.value).toBe("before:after")
    })

    test("when a transaction rolls back, neither its mutation nor outbox enqueue survives", async () => {
      // Arrange
      const failure = new Error("abort transaction")

      // Act
      const mutation = sequelize.transaction(async (transaction) => {
        const record = await DomainRecord.create({ value: "rolled back" }, { transaction })
        const transactionalJob = ProcessRecordJob.withBackend({
          enqueue: (payload) =>
            OutboxRecord.create({ ...payload, status: "pending" }, { transaction }),
        })
        await transactionalJob.performLater(record, "rollback")
        throw failure
      })

      // Assert
      await expect(mutation).rejects.toBe(failure)
      expect(await DomainRecord.count()).toBe(0)
      expect(await OutboxRecord.count()).toBe(0)
    })

    test("when a transaction commits, its durable outbox payload can be relayed to Redis", async () => {
      // Arrange
      const { queue } = await createQueue("records")
      const backend = createBullMQJobBackend(registryForRecord(), new Map([["records", queue]]))

      // Act
      await sequelize.transaction(async (transaction) => {
        const record = await DomainRecord.create({ value: "committed" }, { transaction })
        await ProcessRecordJob.withBackend({
          enqueue: (payload) =>
            OutboxRecord.create({ ...payload, status: "pending" }, { transaction }),
        })
          .queueAs("records")
          .performLater(record, "handled")
      })
      const outbox = await OutboxRecord.findOne({ rejectOnEmpty: true })
      const enqueued = await backend.enqueue(outbox.get(), { jobId: `outbox-${outbox.id}` })

      // Assert
      expect(enqueued.data.jobData).toEqual([1, "handled"])
      expect(await DomainRecord.count()).toBe(1)
    })

    test("when a worker records completion before the relay, the relay preserves its terminal status", async () => {
      // Arrange
      const record = await DomainRecord.create({ value: "pending" })
      const outbox = await OutboxRecord.create({
        queueName: "records",
        jobName: "record-process-v2",
        jobData: [record.id, "done"],
        status: "pending",
      })
      const { queue, events, prefix } = await createQueue("records")
      const backend = createBullMQJobBackend(registryForRecord(), new Map([["records", queue]]))
      const enqueued = await backend.enqueue(outbox.get(), { jobId: `outbox-${outbox.id}` })
      await startWorker("records", registryForRecord(), prefix, 1, {
        async onCompleted() {
          await OutboxRecord.update({ status: "completed" }, { where: { id: outbox.id } })
        },
      })

      // Act
      await enqueued.waitUntilFinished(events, 5000)
      await OutboxRecord.update(
        { status: "enqueued" },
        { where: { id: outbox.id, status: "pending" } }
      )

      // Assert
      const finished = await outbox.reload()
      expect(finished.status).toBe("completed")
    })

    test("when a deserializer deliberately skips a missing model, completes without retrying", async () => {
      // Arrange
      const { queue, events, prefix } = await createQueue("records")
      const backend = createBullMQJobBackend(registryForRecord(), new Map([["records", queue]]))
      const enqueued = await backend.enqueue(
        { queueName: "records", jobName: "record-process-v2", jobData: [999, "missing"] },
        { attempts: 3 }
      )
      await startWorker("records", registryForRecord(), prefix)

      // Act
      await enqueued.waitUntilFinished(events, 5000)

      // Assert
      const finished = await queue.getJob(enqueued.id!)
      expect(finished?.attemptsMade).toBe(1)
    })

    test("when recording a skip fails, records the attempt failure in the host outbox", async () => {
      // Arrange
      const outbox = await OutboxRecord.create({
        queueName: "records",
        jobName: "record-process-v2",
        jobData: [999, "missing"],
        status: "pending",
      })
      const registry = registryForRecord()
      const { queue, events, prefix } = await createQueue("records")
      const backend = createBullMQJobBackend(registry, new Map([["records", queue]]))
      const enqueued = await backend.enqueue(outbox.get())
      await startWorker("records", registry, prefix, 1, {
        onSkipped() {
          throw new Error("skip status update unavailable")
        },
        async onFailed() {
          await OutboxRecord.update({ status: "failed" }, { where: { id: outbox.id } })
        },
      })

      // Act
      const result = enqueued.waitUntilFinished(events, 5000)

      // Assert
      await expect(result).rejects.toThrow("skip status update unavailable")
      const failed = await outbox.reload()
      expect(failed.status).toBe("failed")
    })
  })
})
