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

  async isEnqueued(jobName: string): Promise<boolean> {
    return this.jobs.some((job) => job.jobName === jobName)
  }
}

describe("src/base-job/base-job.ts", () => {
  describe("BaseJob", () => {
    describe(".perform", () => {
      test("runs the job immediately", () => {
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
      test("aliases immediate job execution", () => {
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
      test("enqueues serialized arguments through the configured backend", async () => {
        // Arrange
        const backend = new InMemoryJobBackend()

        class SendEmailJob extends BaseJob<void> {
          static override queueName = "mailers"

          constructor(
            email: string,
            jobFilename?: string
          ) {
            super(jobFilename)
            void email
          }

          perform(): void {
            return undefined
          }
        }

        SendEmailJob.configure({
          backend,
          argumentSerializer: {
            serialize: (...args: unknown[]) => args.map((argument) => String(argument)),
          },
        })

        // Act
        const result = await SendEmailJob.performLater(
          "ada@example.com",
          "send-email-job.ts"
        )

        // Assert
        expect(result).toEqual({
          id: 1,
          queueName: "mailers",
          jobName: "SendEmailJob",
          jobData: ["ada@example.com", "send-email-job.ts"],
          jobFilename: "send-email-job.ts",
        })
      })

      test("fails when no backend is configured", async () => {
        // Arrange
        class UnconfiguredJob extends BaseJob<void> {}

        // Act / Assert
        await expect(UnconfiguredJob.performLater()).rejects.toThrow(MissingJobBackendError)
      })
    })

    describe(".queueAs", () => {
      test("enqueues one call on a custom queue without mutating the job class", async () => {
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
        expect(backend.jobs.map((job) => job.queueName)).toEqual([
          "active-directory",
          "default",
        ])
      })
    })

    describe(".isJobEnqueued", () => {
      test("delegates to the configured backend", async () => {
        // Arrange
        const backend = new InMemoryJobBackend()

        class RefreshReportsJob extends BaseJob<void> {}

        RefreshReportsJob.configure({ backend })
        await RefreshReportsJob.performLater()

        // Act
        const isEnqueued = await RefreshReportsJob.isJobEnqueued()

        // Assert
        expect(isEnqueued).toBe(true)
      })
    })
  })
})
