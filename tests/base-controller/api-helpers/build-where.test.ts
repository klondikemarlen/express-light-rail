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

    test("keeps non-overridable options when keys repeat", () => {
      // Arrange
      const where = { archived: true }

      // Act
      const result = buildWhere(where, { archived: false }, { archived: false })

      expect(result).toEqual({ archived: false })
    })

    test("ignores non-object where input", () => {
      // Arrange
      const where = "bad"

      // Act
      const result = buildWhere(where, { archived: false }, { id: 3 })

      // Assert
      expect(result).toEqual({ archived: false, id: 3 })
    })
  })
})
