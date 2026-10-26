import { Worker, type WorkerOptions } from "bullmq"

import type { JobPayload } from "@/base-job/index.js"
import { JobSkippedError } from "@/jobs/job-skipped-error.js"
import type { JobRegistry } from "@/jobs/job-registry.js"
import type { BullMQJob } from "@/jobs/bullmq/create-bullmq-job-backend.js"
import { logger } from "@/utils/logger.js"

export type JobProcessorHooks = {
  onCompleted?: (job: BullMQJob, result: unknown) => void | Promise<void>
  onSkipped?: (job: BullMQJob, error: JobSkippedError) => void | Promise<void>
  onFailed?: (job: BullMQJob, error: unknown) => void | Promise<void>
}

export function createBullMQJobWorker(
  queueName: string,
  registry: JobRegistry,
  options: Omit<WorkerOptions, "autorun">,
  hooks: JobProcessorHooks = {}
): Worker<JobPayload, unknown, string> {
  const worker = new Worker<JobPayload, unknown, string>(
    queueName,
    async (job) => {
      try {
        let result: unknown
        try {
          result = await registry.perform(job.name, job.data.jobData)
        } catch (error) {
          if (!(error instanceof JobSkippedError)) throw error

          await hooks.onSkipped?.(job, error)
          return undefined
        }

        await hooks.onCompleted?.(job, result)
        return result
      } catch (error) {
        try {
          await hooks.onFailed?.(job, error)
        } catch (reportingError) {
          logger.error("Failed to record job failure", {
            jobName: job.name,
            jobId: job.id,
            error: reportingError,
          })
        }

        throw error
      }
    },
    { ...options, autorun: false }
  )

  worker.on("error", (error) => {
    logger.error("Job worker error", { queueName, error })
  })

  return worker
}
