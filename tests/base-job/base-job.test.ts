import {
  BaseJob,
  MissingJobBackendError,
  type JobBackend,
  type JobPayload,
} from "@/base-job/index.js"

type EnqueuedJob = JobPayload & {
  id: number
}

class InMemoryJobBackend implements JobBackend<EnqueuedJob> {
  readonly jobs: EnqueuedJob[] = []

  async enqueue(payload: JobPayload): Promise<EnqueuedJob> {
    const job = {
      ...payload,
      id: this.jobs.length + 1,
    }
    this.jobs.push(job)
    return job
  }

}

describe("src/base-job/base-job.ts", () => {
  describe("BaseJob", () => {
    describe(".perform", () => {
      test("when performed immediately, returns the job result", () => {
        // Arrange
        class AddNumbersJob extends BaseJob<number> {
          constructor(
            private readonly left: number,
            private readonly right: number
          ) {
            super()
          }

          perform(): number {
            return this.left + this.right
          }
        }

        // Act
        const result = AddNumbersJob.perform(2, 3)

        // Assert
        expect(result).toBe(5)
      })
    })

    describe(".performNow", () => {
      test("when performed now, returns the job result", () => {
        // Arrange
        class BuildLabelJob extends BaseJob<string> {
          constructor(private readonly name: string) {
            super()
          }

          perform(): string {
            return `Hello ${this.name}`
          }
        }

        // Act
        const result = BuildLabelJob.performNow("Ada")

        // Assert
        expect(result).toBe("Hello Ada")
      })
    })

    describe(".performLater", () => {

      test("when no backend is configured, rejects the enqueue", async () => {
        // Arrange
        class UnconfiguredJob extends BaseJob<void> {}

        // Act / Assert
        await expect(UnconfiguredJob.performLater()).rejects.toThrow(MissingJobBackendError)
      })
    })

    describe(".queueAs", () => {
      test("when a queue is overridden, leaves the job class queue unchanged", async () => {
        // Arrange
        const backend = new InMemoryJobBackend()

        class SyncUsersJob extends BaseJob<void> {
          static override queueName = "default"
        }

        SyncUsersJob.configure({ backend })

        // Act
        await SyncUsersJob.queueAs("active-directory").performLater()
        await SyncUsersJob.performLater()

        // Assert
        expect(backend.jobs).toMatchObject([
          { queueName: "active-directory" },
          { queueName: "default" },
        ])
      })
    })

    describe(".withBackend", () => {
      test("when one enqueue uses another backend, leaves inherited configuration unchanged", async () => {
        // Arrange
        const originalBackend = new InMemoryJobBackend()
        const transactionBackend = new InMemoryJobBackend()
        class ApplicationJob extends BaseJob<string> {}
        ApplicationJob.configure({
          backend: originalBackend,
          argumentSerializer: {
            serialize: (...args) => args.map(String),
          },
        })
        class FormatNumberJob extends ApplicationJob {
          constructor(private readonly value: number) {
            super()
          }

          perform(): string {
            return String(this.value)
          }
        }

        // Act
        await FormatNumberJob.withBackend(transactionBackend).performLater(1)
        await FormatNumberJob.performLater(2)

        // Assert
        expect(originalBackend.jobs).toMatchObject([{ jobData: ["2"] }])
      })

      test("when backend and queue scopes are combined, preserves inherited serialization", async () => {
        // Arrange
        const transactionBackend = new InMemoryJobBackend()
        class ApplicationJob extends BaseJob<string> {}
        ApplicationJob.configure({
          argumentSerializer: {
            serialize: (...args) => args.map(String),
          },
        })
        class FormatNumberJob extends ApplicationJob {
          constructor(private readonly value: number) {
            super()
          }

          perform(): string {
            return String(this.value)
          }
        }

        // Act
        await FormatNumberJob.withBackend(transactionBackend).queueAs("outbox").performLater(3)

        // Assert
        expect(transactionBackend.jobs).toMatchObject([
          { queueName: "outbox", jobData: ["3"] },
        ])
      })
    })
  })
})
