import { buildPagination } from "@/base-controller/api-helpers/index.js"

describe("tests/base-controller/api-helpers/build-pagination.test.ts", () => {
  describe("buildPagination", () => {
    test("uses defaults when query params are missing", () => {
      // Arrange
      const query: Record<string, unknown> = {}

      // Act
      const pagination = buildPagination(query)

      // Assert
      expect(pagination).toEqual({ page: 1, perPage: 10, limit: 10, offset: 0 })
    })

    test("caps perPage at 1000", () => {
      // Arrange
      const query = { page: "2", perPage: "5000" }

      // Act
      const pagination = buildPagination(query)

      // Assert
      expect(pagination.limit).toBe(1000)
      expect(pagination.offset).toBe(1000)
    })

    test("uses max per page when perPage is -1", () => {
      // Arrange
      const query = { perPage: "-1" }

      // Act
      const pagination = buildPagination(query)

      // Assert
      expect(pagination.limit).toBe(1000)
    })
  })
})
