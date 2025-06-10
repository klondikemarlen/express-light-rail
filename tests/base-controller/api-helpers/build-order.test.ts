import { buildOrder, type ModelOrder } from "@/base-controller/api-helpers/index.js"

describe("tests/base-controller/api-helpers/build-order.test.ts", () => {
  describe("buildOrder", () => {
    test("returns default order when input is undefined", () => {
      // Arrange
      const overridable: ModelOrder[] = [["name", "asc"]]
      const nonOverridable: ModelOrder[] = [["id", "desc"]]

      // Act
      const order = buildOrder(undefined, overridable, nonOverridable)

      // Assert
      expect(order).toEqual([["id", "desc"], ["name", "asc"]])
    })

    test("inserts order between non-overridable and overridable", () => {
      // Arrange
      const queryOrder: ModelOrder[] = [["createdAt", "desc"]]
      const overridable: ModelOrder[] = [["name", "asc"]]
      const nonOverridable: ModelOrder[] = [["id", "desc"]]

      // Act
      const order = buildOrder(queryOrder, overridable, nonOverridable)

      // Assert
      expect(order).toEqual([["id", "desc"], ["createdAt", "desc"], ["name", "asc"]])
    })

    test("ignores non-array order", () => {
      // Arrange
      const overridable: ModelOrder[] = []
      const nonOverridable: ModelOrder[] = [["id", "desc"]]

      // Act
      const order = buildOrder("bad" as unknown, overridable, nonOverridable)

      // Assert
      expect(order).toEqual([["id", "desc"]])
    })
  })
})
