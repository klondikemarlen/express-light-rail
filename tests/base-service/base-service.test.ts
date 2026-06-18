import { BaseService } from "@/base-service/index.js"

describe("src/base-service/base-service.ts", () => {
  describe("BaseService", () => {
    describe(".perform", () => {
      test("when called on a service with constructor arguments, it returns the instance result", () => {
        // Arrange
        class FullNameService extends BaseService {
          constructor(
            private givenName: string,
            private familyName: string
          ) {
            super()
          }

          perform(): string {
            return `${this.givenName} ${this.familyName}`
          }
        }

        // Act
        const result = FullNameService.perform("Ada", "Lovelace")

        // Assert
        expect(result).toBe("Ada Lovelace")
      })

      test("when called on an async service, it preserves the resolved result", async () => {
        // Arrange
        class LoadNamesService extends BaseService {
          async perform(): Promise<string[]> {
            return ["Ada", "Grace"]
          }
        }

        // Act
        const result = await LoadNamesService.perform()

        // Assert
        expect(result).toEqual(["Ada", "Grace"])
      })
    })
  })
})
