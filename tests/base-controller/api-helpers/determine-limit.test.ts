import { determineLimit } from "@/base-controller/api-helpers/index.js"

describe("tests/base-controller/api-helpers/determine-limit.test.ts", () => {
  describe("determineLimit", () => {
    test("returns max per page for -1", () => {
      // Arrange
      const perPage = -1

      // Act
      const limit = determineLimit(perPage)

      // Assert
      expect(limit).toBe(1000)
    })

    test("caps at max per page", () => {
      // Arrange
      const perPage = 5000

      // Act
      const limit = determineLimit(perPage)

      // Assert
      expect(limit).toBe(1000)
    })

    test("floors at 1", () => {
      // Arrange
      const perPage = 0

      // Act
      const limit = determineLimit(perPage)

      // Assert
      expect(limit).toBe(1)
    })
  })
})
