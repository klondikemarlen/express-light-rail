import { BaseJob } from "@/base-job/index.js"
import { JobSkippedError } from "@/jobs/job-skipped-error.js"

import { JobRegistry } from "@/jobs/job-registry.js"

describe("src/jobs/job-registry.ts", () => {
  describe("JobRegistry", () => {
    describe(".perform", () => {
      test("when arguments are decoded asynchronously, returns the concrete job result", async () => {
        // Arrange
        class CalculateInvoiceTotalJob extends BaseJob<number> {
          constructor(
            private readonly unitPrice: number,
            private readonly quantity: number
          ) {
            super()
          }

          perform(): number {
            return this.unitPrice * this.quantity
          }
        }

        const registry = new JobRegistry()
        registry.register(CalculateInvoiceTotalJob, {
          async deserialize(storedPrice, storedQuantity) {
            await Promise.resolve()
            return [Number(storedPrice), Number(storedQuantity)]
          },
        })

        // Act
        const result = await registry.perform("CalculateInvoiceTotalJob", [12.5, "4"])

        // Assert
        expect(result).toBe(50)
      })

      test("when an explicit legacy alias is used, performs the registered current job", async () => {
        // Arrange
        class ReconciledAccountJob extends BaseJob<string> {
          static jobName = "accounts.reconcile"

          constructor(private readonly accountId: number) {
            super()
          }

          perform(): string {
            return `reconciled account ${this.accountId}`
          }
        }

        const registry = new JobRegistry()
        registry.register(ReconciledAccountJob, {
          aliases: ["LegacyReconcileAccountJob"],
          deserialize: (...stored) => [Number(stored[0])],
        })

        // Act
        const result = await registry.perform("LegacyReconcileAccountJob", [73])

        // Assert
        expect(result).toBe("reconciled account 73")
      })

      test("when the job name is unknown, rejects without loading a job", async () => {
        // Arrange
        const registry = new JobRegistry()

        // Act
        const result = registry.perform("UnregisteredJob", [])

        // Assert
        await expect(result).rejects.toThrow("Job identity is not registered: UnregisteredJob")
      })

      test("when deserialization fails, propagates the original failure", async () => {
        // Arrange
        class ImportCustomerJob extends BaseJob<string> {
          constructor(private readonly customerId: number) {
            super()
          }

          perform(): string {
            return `imported customer ${this.customerId}`
          }
        }

        const registry = new JobRegistry()
        const failure = new Error("Customer reference is unavailable")
        registry.register(ImportCustomerJob, {
          deserialize: () => {
            throw failure
          },
        })

        // Act
        const result = registry.perform("ImportCustomerJob", [18])

        // Assert
        await expect(result).rejects.toBe(failure)
      })

      test("when deserialization explicitly skips a job, propagates the skip error", async () => {
        // Arrange
        class SendReceiptJob extends BaseJob<string> {
          constructor(private readonly receiptId: string) {
            super()
          }

          perform(): string {
            return `sent receipt ${this.receiptId}`
          }
        }

        const registry = new JobRegistry()
        const skipped = new JobSkippedError("Receipt was cancelled")
        registry.register(SendReceiptJob, {
          deserialize: () => {
            throw skipped
          },
        })

        // Act
        const result = registry.perform("SendReceiptJob", ["receipt-5"])

        // Assert
        await expect(result).rejects.toBe(skipped)
      })

      test("when another registration conflicts on an alias, preserves the original alias work", async () => {
        // Arrange
        class RebuildSearchIndexJob extends BaseJob<string> {
          constructor(private readonly indexName: string) {
            super()
          }

          perform(): string {
            return `rebuilt ${this.indexName}`
          }
        }

        class DeleteSearchIndexJob extends BaseJob<string> {
          constructor(private readonly indexName: string) {
            super()
          }

          perform(): string {
            return `deleted ${this.indexName}`
          }
        }

        const registry = new JobRegistry()
        registry.register(RebuildSearchIndexJob, {
          aliases: ["SearchIndexJob"],
          deserialize: (...stored) => [String(stored[0])],
        })

        // Act
        let registrationFailure: unknown
        try {
          registry.register(DeleteSearchIndexJob, {
            aliases: ["SearchIndexJob"],
            deserialize: (...stored) => [String(stored[0])],
          })
        } catch (error) {
          registrationFailure = error
        }
        const originalResult = await registry.perform("SearchIndexJob", ["products"])

        // Assert
        expect(registrationFailure).toBeInstanceOf(Error)
        expect(originalResult).toBe("rebuilt products")
      })
    })
  })
})
