import { buildFilterScopes } from "@/base-controller/api-helpers/index.js"
import { type BaseScopeOptions } from "@/base-policy/index.js"

describe("tests/base-controller/api-helpers/build-filter-scopes.test.ts", () => {
  describe("buildFilterScopes", () => {
    test("adds filters as scopes", () => {
      // Arrange
      const initial: BaseScopeOptions[] = [{ method: ["existing", true] }]

      // Act
      const scopes = buildFilterScopes({ byStatus: "active", byType: 1 }, initial)

      // Assert
      expect(scopes).toEqual<BaseScopeOptions[]>([
        { method: ["existing", true] },
        { method: ["byStatus", "active"] },
        { method: ["byType", 1] },
      ])
    })

    test("returns initial scopes when no filters", () => {
      // Arrange
      const initial: BaseScopeOptions[] = [{ method: ["existing", true] }]

      // Act
      const scopes = buildFilterScopes(undefined, initial)

      // Assert
      expect(scopes).toEqual(initial)
    })

    test("ignores non-object filters", () => {
      // Arrange
      const initial: BaseScopeOptions[] = []

      // Act
      const scopes = buildFilterScopes("bad" as unknown, initial)

      // Assert
      expect(scopes).toEqual(initial)
    })
  })
})
