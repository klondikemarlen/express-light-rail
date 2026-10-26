# Base Job

`BaseJob` provides the Rails ActiveJob-like call surface independently of queue persistence. Hosts can keep a custom `JobBackend` or adopt the [optional BullMQ runtime](../../docs/jobs.md), with explicit worker lifecycle and host-owned transactional outbox handling.

```ts
export class SendWelcomeEmailJob extends BaseJob<void> {
  static override queueName = "mailers"

  constructor(private readonly userId: number) {
    super()
  }

  perform(): void {
    // send email
  }
}

SendWelcomeEmailJob.configure({ backend })
await SendWelcomeEmailJob.performLater(1)
await SendWelcomeEmailJob.queueAs("slow-mailers").performLater(1)
```

## Responsibilities

Jobs should:

- expose `perform(...)` for immediate execution
- expose `performLater(...)` for host-owned queue persistence
- use `queueAs(...)` for one-off queue overrides
- serialize arguments through a configured `JobArgumentSerializer` when needed
- select a stable `jobName` for durable payloads and use `withBackend(...)` for transaction-scoped enqueue without changing global configuration

Jobs should not:

- assume a database table name
- force a worker implementation on ordinary package imports
- assume pub/sub channel semantics
- embed app-specific model lookup rules in this package

## Host integration

Host apps provide `JobBackend`:

```ts
const backend: JobBackend = {
  enqueue(payload) {
    return BackgroundJob.create(payload)
  },
}
```

Model reference serialization and lookup policy stay host-owned. The optional runtime's registry pairs each job with a deserializer; missing or deliberately obsolete records can be explicitly skipped instead of silently dropping durable work. See [jobs ownership and migration](../../docs/jobs.md).
