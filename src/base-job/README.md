# Base Job

`BaseJob` provides the Rails ActiveJob-like call surface without choosing a queue, worker, pub/sub channel, or persistence model for the host app.

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

Jobs should not:

- assume a database table name
- assume a worker implementation
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

A future Sequelize model argument serializer can plug into `JobArgumentSerializer` once it proves reusable across WRAP, travel-authorization, and ELCC.
