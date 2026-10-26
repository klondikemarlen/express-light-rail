import { BaseJob, type JobBackend } from "@/base-job/index.js"

import { JobRegistry } from "@/jobs/job-registry.js"

class RenderReceiptJob extends BaseJob<string> {
  static readonly category = "receipts" as const

  constructor(
    private readonly receiptId: string,
    private readonly includeDetails: boolean
  ) {
    super()
  }

  perform(): string {
    return this.includeDetails
      ? `receipt ${this.receiptId} with details`
      : `receipt ${this.receiptId}`
  }
}

export function verifyJobRegistryConsumerTypes(registry: JobRegistry, backend: JobBackend): void {
  registry.register(RenderReceiptJob, {
    deserialize: (...stored) => [String(stored[0]), Boolean(stored[1])],
  })

  registry.register(RenderReceiptJob, {
    // @ts-expect-error The decoded constructor tuple must contain both arguments with their declared types.
    deserialize: (...stored) => [Number(stored[0])],
  })

  const queuedReceiptJob = RenderReceiptJob.queueAs("priority")
  const backendReceiptJob = RenderReceiptJob.withBackend(backend)
  const queuedBackendReceiptJob = queuedReceiptJob.withBackend(backend)

  const queuedCategory: "receipts" = queuedReceiptJob.category
  const backendCategory: "receipts" = backendReceiptJob.category
  const queuedBackendCategory: "receipts" = queuedBackendReceiptJob.category

  void queuedCategory
  void backendCategory
  void queuedBackendCategory

  // @ts-expect-error performLater retains the subclass constructor argument tuple.
  void backendReceiptJob.performLater(42, true)
}
