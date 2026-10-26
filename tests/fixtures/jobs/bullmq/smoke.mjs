import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"

import { BaseJob } from "express-light-rail"
import { Queue, QueueEvents } from "bullmq"
import {
  createBullMQJobBackend,
  createBullMQJobWorker,
  JobRegistry,
} from "express-light-rail/jobs/bullmq"

const redisUrl = process.env.REDIS_URL
if (!redisUrl) throw new Error("REDIS_URL must point to disposable Redis")
const url = new URL(redisUrl)
const connection = {
  host: url.hostname,
  port: Number(url.port || 6379),
  db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
  ...(url.username ? { username: url.username } : {}),
  ...(url.password ? { password: url.password } : {}),
}
const queueName = "consumer-smoke"
const prefix = `consumer-smoke-${process.pid}-${randomUUID()}`
const queue = new Queue(queueName, { connection, prefix })
const events = new QueueEvents(queueName, { connection, prefix })
const registry = new JobRegistry()
let worker
let running

class SmokeJob extends BaseJob {
  static jobName = "consumer-smoke-job"
  static queueName = queueName

  constructor(value) {
    super()
    this.value = value
  }

  perform() {
    return `processed:${this.value}`
  }
}

registry.register(SmokeJob, { deserialize: (value) => [String(value)] })
const backend = createBullMQJobBackend(registry, new Map([[queueName, queue]]))
SmokeJob.configure({ backend })

try {
  await Promise.all([queue.waitUntilReady(), events.waitUntilReady()])
  worker = createBullMQJobWorker(queueName, registry, { connection, prefix })
  await worker.waitUntilReady()
  running = worker.run()
  await SmokeJob.performLater("real consumer")
  const nativeJob = (await queue.getJobs(["waiting", "active", "completed"]))[0]
  assert.ok(nativeJob, "performLater must enqueue a native BullMQ job")
  assert.equal(await nativeJob.waitUntilFinished(events, 5_000), "processed:real consumer")
  console.log("PASS: packed package enqueued and processed a native BullMQ job")
} finally {
  try {
    if (worker) {
      await worker.close()
      await running
    }
    await events.close()
    await queue.obliterate({ force: true })
  } finally {
    await queue.close()
  }
}
