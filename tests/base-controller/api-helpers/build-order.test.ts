import { buildOrder, type ModelOrder } from "@/base-controller/api-helpers/index.js"

describe("tests/base-controller/api-helpers/build-order.test.ts", () => {
  describe("buildOrder", () => {
    test("returns default order when input is undefined", () => {
      // Arrange
      const overridableOrder: ModelOrder[] = [["name", "asc"]]
      const nonOverridableOrder: ModelOrder[] = [["id", "desc"]]

      // Act
      const order = buildOrder(undefined, overridableOrder, nonOverridableOrder)

      // Assert
      expect(order).toEqual([
        ["id", "desc"],
        ["name", "asc"],
      ])
    })

    test("places query order between non-overridable and overridable order", () => {
      // Arrange
      const queryOrder: ModelOrder[] = [["createdAt", "desc"]]
      const overridableOrder: ModelOrder[] = [["name", "asc"]]
      const nonOverridableOrder: ModelOrder[] = [["id", "desc"]]

      // Act
      const order = buildOrder(queryOrder, overridableOrder, nonOverridableOrder)

      // Assert
      expect(order).toEqual([
        ["id", "desc"],
        ["createdAt", "desc"],
        ["name", "asc"],
      ])
    })

    test("keeps the highest-priority order when columns repeat", () => {
      // Arrange
      const queryOrder: ModelOrder[] = [
        ["name", "desc"],
        ["id", "desc"],
      ]
      const overridableOrder: ModelOrder[] = [["name", "asc"]]
      const nonOverridableOrder: ModelOrder[] = [["id", "asc"]]

      // Act
      const order = buildOrder(queryOrder, overridableOrder, nonOverridableOrder)

      // Assert
      expect(order).toEqual([
        ["id", "asc"],
        ["name", "desc"],
      ])
    })

    test("ignores non-array order", () => {
      // Arrange
      const overridableOrder: ModelOrder[] = []
      const nonOverridableOrder: ModelOrder[] = [["id", "desc"]]

      // Act
      const order = buildOrder("bad", overridableOrder, nonOverridableOrder)

      // Assert
      expect(order).toEqual([["id", "desc"]])
    })
  })
})
