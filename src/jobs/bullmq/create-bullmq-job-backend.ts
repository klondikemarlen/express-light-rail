import type { Job, JobsOptions, JobType, Queue } from "bullmq"

import type { JobBackend, JobPayload } from "@/base-job/index.js"
import type { JobRegistry } from "@/jobs/job-registry.js"

export type BullMQJob = Job<JobPayload, unknown, string>
export type BullMQJobQueue = Queue<JobPayload, unknown, string>
export type BullMQJobBackend = JobBackend<BullMQJob> & {
  enqueue(payload: JobPayload, options?: JobsOptions): Promise<BullMQJob>
  isEnqueued(jobName: string): Promise<boolean>
}

const OUTSTANDING_JOB_STATES: JobType[] = [
  "waiting",
  "active",
  "delayed",
  "paused",
  "prioritized",
  "waiting-children",
]

export function createBullMQJobBackend(
  registry: JobRegistry,
  queues: ReadonlyMap<string, BullMQJobQueue>
): BullMQJobBackend {
  return {
    async enqueue(payload, options) {
      const queue = queues.get(payload.queueName)
      if (queue === undefined) {
        throw new Error(`Job queue is not configured: ${payload.queueName}`)
      }

      const name = registry.resolveName(payload.jobName)
      return queue.add(name, payload, options)
    },

    async isEnqueued(jobName) {
      const name = registry.resolveName(jobName)

      for (const queue of queues.values()) {
        let start = 0
        while (true) {
          const jobs = await queue.getJobs(OUTSTANDING_JOB_STATES, start, start + 99)
          if (jobs.some((job) => job.name === name)) return true
          if (jobs.length < 100) break

          start += 100
        }
      }

      return false
    },
  }
}
