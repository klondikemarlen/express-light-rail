# Optional BullMQ jobs

`express-light-rail/jobs/bullmq` adds registered job execution to the existing `BaseJob`. Install BullMQ `>=5.81.5 <6` explicitly; ordinary `express-light-rail` imports do not load BullMQ, connect to Redis, or start workers. The consumer fixture uses BullMQ 5.81.5 with Redis 7. Host applications retain Redis configuration, database models, queue policy, deployment, and process entrypoints.

```sh
npm install express-light-rail bullmq@^5.81.5
```

## Minimal worker

Keep job classes and registration near the host's existing jobs. Use an explicit `jobName` for durable identity: class names can change during refactoring or bundling. Deserializers own argument validation, payload-version migration, and model lookup; their return tuple must match the constructor.

```ts
import { Queue } from "bullmq"
import { BaseJob, type JobPayload } from "express-light-rail"
import {
  createBullMQJobBackend,
  createBullMQJobWorker,
  JobRegistry,
} from "express-light-rail/jobs/bullmq"

class AddNumbersJob extends BaseJob<number> {
  static override jobName = "numbers.add.v1"

  constructor(private readonly left: number, private readonly right: number) {
    super()
  }

  perform(): number {
    return this.left + this.right
  }
}

const registry = new JobRegistry()
registry.register(AddNumbersJob, {
  deserialize(left, right) {
    if (typeof left !== "number" || typeof right !== "number") {
      throw new TypeError("Expected two numbers")
    }
    return [left, right]
  },
})

const connection = { host: "127.0.0.1", port: 6379 }
const queue = new Queue<JobPayload, unknown, string>("default", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
})
const backend = createBullMQJobBackend(registry, new Map([["default", queue]]))
AddNumbersJob.configure({ backend })

const worker = createBullMQJobWorker("default", registry, {
  connection,
  concurrency: 2,
})
const running = worker.run()
await AddNumbersJob.performLater(20, 22)
```

The factory returns a native BullMQ `Worker` with `autorun: false`. Start it explicitly with `run()`, retain that promise, and use native worker events and options for monitoring, concurrency, rate limits, and retries. Configure a queue and worker for each queue selected by `queueName` or `queueAs(...)`; mapping a queue does not start its worker. Supply the same BullMQ connection, prefix, and queue name on both sides. Keep any rejected `run()` promise under host process error handling.

On host shutdown, stop producers and relay activity first, then close the worker and queue. `close()` waits for active processing, not all waiting jobs; waiting work remains in Redis for the next worker. Close any host-created `QueueEvents` and externally shared Redis clients under their native ownership rules too.

```ts
await worker.close()
await running
await queue.close()
```

## Serialization and outcomes

`BaseJob.configure({ argumentSerializer })` controls producer serialization and is inherited by subclasses. `Job.withBackend(backend)` selects a backend for that call without mutating the class configuration; it composes with `queueAs(...)` and preserves the serializer. Persist JSON-safe values or stable references, not live model instances. Snapshot immutable delivery fields when a record can be deleted before execution and those fields are sufficient; reload a model only when current state is required.

`JobRegistry.register(JobClass, { deserialize, aliases })` explicitly allows execution. Unknown identities and conflicting registrations reject; the runtime never imports arbitrary filenames. A host deserializer can throw `JobSkippedError` for a deliberately obsolete or deleted-model job. Other lookup, decoding, and execution errors fail the attempt and remain eligible for the host's native BullMQ retry/backoff settings. Do not classify infrastructure failures as deleted-model skips.

Optional worker hooks `onCompleted(job, result)`, `onSkipped(job, error)`, and `onFailed(job, error)` can record host outbox outcomes. They are awaited: successful work is not acknowledged before its completion hook finishes. A failure hook runs for each failed attempt, not only after retries are exhausted; use BullMQ attempt information when choosing host status transitions. A failure-reporting hook error is logged without replacing the original processing error. Explicit skips complete without retry when their hook succeeds. Native worker errors are logged through the package's Winston logger; hosts can also attach native listeners.

`backend.isEnqueued(name)` and `Job.isJobEnqueued()` inspect outstanding waiting, active, delayed, paused, prioritized, and waiting-for-children work across the backend's mapped queues. Terminal completed/failed jobs and host SQL rows are excluded. This is a queue observation, not an atomic coalescing lock or an outbox-pending query.

## Transactional outbox handoff

Direct Redis enqueue is not atomic with a SQL mutation. If the mutation requires durable delivery, the host must provide an outbox table and enqueue its row in the same SQL transaction. The package does not install a schema, run migrations, claim rows, or start a relay. A typical host row contains a unique identifier, `queueName`, `jobName`, JSON `jobData`, and delivery status; optional `jobFilename` remains payload metadata and is not executed.

For host-owned Sequelize models `Invoice` and `BackgroundJob`, use the transaction-scoped backend for the enqueue:

```ts
import type { JobBackend } from "express-light-rail"

await database.transaction(async (transaction) => {
  await invoice.update({ receiptRequested: true }, { transaction })
  const outboxBackend: JobBackend = {
    enqueue(payload) {
      return BackgroundJob.create({ ...payload, status: "pending" }, { transaction })
    },
  }
  await SendReceiptJob.withBackend(outboxBackend).performLater(invoice.id)
})
```

A rollback must remove both the mutation and outbox row. After commit, the host relay claims pending rows and calls `backend.enqueue(payload, { jobId })`. Use a deterministic BullMQ-compatible identifier, such as `outbox-${row.id}`, and keep it stable when replaying a row after a crash. Do not remove completed or failed BullMQ records while relying on their identifiers for deduplication. Cleanup/retention is host policy; deleting the Redis record permits that identifier to enqueue again.

After Redis accepts a row, update SQL from `pending` to `enqueued` conditionally. A worker may already have recorded `completed`, `skipped`, or `failed`; the relay must never overwrite that later status. Acknowledging Redis and updating SQL are separate operations: a crash can replay the row, and BullMQ retries can execute work more than once. Delivery is **at least once**, not exactly once. Make business operations idempotent; use host transaction/uniqueness rules where repeated effects would be unsafe. Concurrent relay claims, lost leases, recovery, and schema retention remain the host's responsibility.

## Incremental migration and durable compatibility

Keep the Express router, existing job classes, domain behavior, database setup, and process management. Adopt one job and one queue first. Replace its copied producer/backend and worker execution mechanism only after real success, failure, retry, and shutdown checks pass in the host. Existing custom `JobBackend` integrations remain valid without BullMQ.

For this runtime's already-enqueued payloads, keep the stable `jobName` when renaming a class or module. Explicit registry `aliases` can resolve earlier names to the same registration without keeping obsolete module shims. Retain old argument decoding or migrate pending payloads before changing constructor arity, order, or representation. An alias changes identity resolution, not payload shape. Do not remove an alias or old decoder until both SQL and Redis have drained the corresponding work.

WRAP's original worker payload/module loader is **not** this registry's wire format. Do not point the new worker at an existing WRAP queue and assume aliases make it compatible. Drain the original queue with its original worker, or perform a host-audited payload migration, then cut producers and workers over together to a new queue. Preserve rollback and outstanding work explicitly. No host application is automatically upgraded.

## Consumer verification

From the repository, build and pack the candidate, then run the external consumer against a disposable Redis instance:

```sh
npm run build
npm pack
REDIS_URL=redis://127.0.0.1:6379 bash tests/fixtures/jobs/bullmq/smoke.sh /absolute/path/to/express-light-rail-VERSION.tgz
```

The consumer owns a real SQLite outbox and native Redis/BullMQ lifecycle. For release verification, fetch the exact published artifact with `npm pack express-light-rail@VERSION`, then pass that artifact to the same command. A local pack is candidate evidence, not publication or installed-release proof.
