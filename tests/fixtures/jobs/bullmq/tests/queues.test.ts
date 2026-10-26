import { Queue, QueueEvents } from "bullmq"
import { afterEach, describe, expect, test } from "vitest"

import { BaseJob, type JobPayload } from "express-light-rail"

import {
  createBullMQJobBackend,
  createBullMQJobWorker,
  JobRegistry,
} from "express-light-rail/jobs/bullmq"

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
  concurrency = 1
) {
  const worker = createBullMQJobWorker(queueName, registry, {
    connection: redisOptions,
    prefix,
    concurrency,
  })
  await worker.waitUntilReady()
  const running = worker.run()
  cleanup.push(async () => {
    await worker.close()
    await running
  })
}

class LegacyJob extends BaseJob<string> {
  static override jobName = "legacy-job-v1"

  constructor(private readonly value: string) {
    super()
  }

  override perform(): string {
    return `legacy:${this.value}`
  }
}

function legacyRegistry() {
  const registry = new JobRegistry()
  registry.register(LegacyJob, {
    aliases: ["OldLegacyJob"],
    deserialize: (value) => [String(value)],
  })
  return registry
}

describe("installed BullMQ queues", () => {
  describe("durable identities and failures", () => {
    test("when an old identity is already queued, executes its registered current job", async () => {
      // Arrange
      const { queue, events, prefix } = await createQueue("legacy")
      const enqueued = await queue.add("OldLegacyJob", {
        queueName: "legacy",
        jobName: "OldLegacyJob",
        jobData: ["hello"],
      })
      await startWorker("legacy", legacyRegistry(), prefix)

      // Act
      const result = await enqueued.waitUntilFinished(events, 5000)

      // Assert
      expect(result).toBe("legacy:hello")
    })

    test("when a retained relay identifier is replayed, leaves only one queued delivery", async () => {
      // Arrange
      const { queue } = await createQueue("legacy")
      const backend = createBullMQJobBackend(legacyRegistry(), new Map([["legacy", queue]]))
      const payload = { queueName: "legacy", jobName: "legacy-job-v1", jobData: ["replay"] }

      // Act
      await backend.enqueue(payload, { jobId: "outbox-42" })
      await backend.enqueue(payload, { jobId: "outbox-42" })

      // Assert
      expect(await queue.getWaitingCount()).toBe(1)
    })

    test("when decoding fails unexpectedly, preserves the native processing failure", async () => {
      // Arrange
      const registry = new JobRegistry()
      registry.register(LegacyJob, {
        deserialize() {
          throw new Error("database unavailable")
        },
      })
      const { queue, events, prefix } = await createQueue("failure")
      const backend = createBullMQJobBackend(registry, new Map([["failure", queue]]))
      const enqueued = await backend.enqueue({
        queueName: "failure",
        jobName: "legacy-job-v1",
        jobData: [],
      })
      await startWorker("failure", registry, prefix)

      // Act
      const result = enqueued.waitUntilFinished(events, 5000)

      // Assert
      await expect(result).rejects.toThrow("database unavailable")
    })

    test("when native retry and backoff are configured, retries the failed job twice", async () => {
      // Arrange
      const registry = new JobRegistry()
      registry.register(LegacyJob, {
        deserialize() {
          throw new Error("retryable failure")
        },
      })
      const { queue, events, prefix } = await createQueue("retry")
      const backend = createBullMQJobBackend(registry, new Map([["retry", queue]]))
      const enqueued = await backend.enqueue(
        { queueName: "retry", jobName: "legacy-job-v1", jobData: [] },
        {
          attempts: 3,
          backoff: { type: "fixed", delay: 20 },
        }
      )
      await startWorker("retry", registry, prefix)

      // Act
      const result = enqueued.waitUntilFinished(events, 5000)

      // Assert
      await expect(result).rejects.toThrow("retryable failure")
      const finished = await queue.getJob(enqueued.id!)
      expect(finished?.attemptsMade).toBe(3)
    })
  })
  describe("queue status and lifecycle", () => {
    test("when a worker is not started, reports its waiting job without processing it", async () => {
      // Arrange
      const registry = legacyRegistry()
      const { queue, prefix } = await createQueue("stopped")
      const worker = createBullMQJobWorker("stopped", registry, {
        connection: redisOptions,
        prefix,
      })
      cleanup.push(() => worker.close())
      await worker.waitUntilReady()
      const backend = createBullMQJobBackend(registry, new Map([["stopped", queue]]))
      await backend.enqueue({
        queueName: "stopped",
        jobName: "legacy-job-v1",
        jobData: ["waiting"],
      })

      // Act
      const outstanding = await backend.isEnqueued("legacy-job-v1")

      // Assert
      expect(outstanding).toBe(true)
      expect(await queue.getWaitingCount()).toBe(1)
    })

    test("when a delayed job is the only outstanding work, reports it as enqueued", async () => {
      // Arrange
      const { queue } = await createQueue("delayed")
      const backend = createBullMQJobBackend(legacyRegistry(), new Map([["delayed", queue]]))
      await backend.enqueue(
        { queueName: "delayed", jobName: "legacy-job-v1", jobData: ["later"] },
        { delay: 60000 }
      )

      // Act
      const outstanding = await backend.isEnqueued("legacy-job-v1")

      // Assert
      expect(outstanding).toBe(true)
    })

    test("when a legacy alias is outstanding beside unrelated work, includes it in canonical status", async () => {
      // Arrange
      const { queue } = await createQueue("legacy")
      const backend = createBullMQJobBackend(legacyRegistry(), new Map([["legacy", queue]]))
      await queue.add("UnregisteredJob", {
        queueName: "legacy",
        jobName: "UnregisteredJob",
        jobData: [],
      })
      await queue.add("OldLegacyJob", {
        queueName: "legacy",
        jobName: "OldLegacyJob",
        jobData: ["waiting"],
      })

      // Act
      const outstanding = await backend.isEnqueued("legacy-job-v1")

      // Assert
      expect(outstanding).toBe(true)
    })

    test("when active work finishes, stops reporting it as outstanding", async () => {
      // Arrange
      const started = Promise.withResolvers<void>()
      const release = Promise.withResolvers<void>()
      class BlockingJob extends BaseJob<Promise<string>> {
        override async perform() {
          started.resolve()
          await release.promise
          return "finished"
        }
      }
      const registry = new JobRegistry()
      registry.register(BlockingJob, { deserialize: () => [] })
      const { queue, events, prefix } = await createQueue("active")
      const backend = createBullMQJobBackend(registry, new Map([["active", queue]]))
      const enqueued = await backend.enqueue({
        queueName: "active",
        jobName: "BlockingJob",
        jobData: [],
      })
      await startWorker("active", registry, prefix)
      cleanup.push(async () => release.resolve())
      await started.promise

      // Act
      const activeStatus = await backend.isEnqueued("BlockingJob")
      release.resolve()
      await enqueued.waitUntilFinished(events, 5000)
      const completedStatus = await backend.isEnqueued("BlockingJob")

      // Assert
      expect(activeStatus).toBe(true)
      expect(completedStatus).toBe(false)
    })

    test("when concurrency is two, starts both jobs before either finishes", async () => {
      // Arrange
      const started = Promise.withResolvers<void>()
      const release = Promise.withResolvers<void>()
      let active = 0
      class ConcurrentJob extends BaseJob<Promise<void>> {
        override async perform() {
          active += 1
          if (active === 2) started.resolve()
          await release.promise
        }
      }
      const registry = new JobRegistry()
      registry.register(ConcurrentJob, { deserialize: () => [] })
      const { queue, prefix } = await createQueue("running")
      await queue.add("ConcurrentJob", {
        queueName: "running",
        jobName: "ConcurrentJob",
        jobData: [],
      })
      await queue.add("ConcurrentJob", {
        queueName: "running",
        jobName: "ConcurrentJob",
        jobData: [],
      })
      await startWorker("running", registry, prefix, 2)
      cleanup.push(async () => release.resolve())

      // Act
      await started.promise

      // Assert
      expect(active).toBe(2)
    })

    test("when one queue has a worker, leaves another queue's jobs waiting", async () => {
      // Arrange
      const registry = legacyRegistry()
      const { queue, events, prefix } = await createQueue("running")
      const isolated = await createQueue("isolated", prefix)
      const backend = createBullMQJobBackend(
        registry,
        new Map([
          ["running", queue],
          ["isolated", isolated.queue],
        ])
      )
      await LegacyJob.withBackend(backend).queueAs("isolated").performLater("waiting")
      const enqueued = await backend.enqueue({
        queueName: "running",
        jobName: "legacy-job-v1",
        jobData: ["processed"],
      })
      await startWorker("running", registry, prefix)

      // Act
      await enqueued.waitUntilFinished(events, 5000)

      // Assert
      expect(await isolated.queue.getWaitingCount()).toBe(1)
    })
  })
})
