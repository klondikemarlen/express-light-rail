import { buildWhere } from "@/base-controller/api-helpers/index.js"

describe("tests/base-controller/api-helpers/build-where.test.ts", () => {
  describe("buildWhere", () => {
    test("merges overridable, query, and non-overridable options", () => {
      // Arrange
      const where = { name: "bob", archived: true }

      // Act
      const result = buildWhere(where, { archived: false }, { id: 5 })

      // Assert
      expect(result).toEqual({ archived: true, name: "bob", id: 5 })
    })

    test("non-overridable options win", () => {
      // Arrange
      const where = { archived: true }

      // Act
      const result = buildWhere(where, { archived: false }, { archived: false })

      // Assert
      expect(result.archived).toBe(false)
    })
  })
})
