import { buildFilterScopes } from "@/base-controller/api-helpers/index.js"
import { type BaseScopeOptions } from "@/base-policy/index.js"

describe("tests/base-controller/api-helpers/build-filter-scopes.test.ts", () => {
  describe("buildFilterScopes", () => {
    test("adds filters as scopes without mutating initial scopes", () => {
      // Arrange
      const initialScopes: BaseScopeOptions[] = [{ method: ["existing", true] }]

      // Act
      const scopes = buildFilterScopes({ byStatus: "active", byType: 1 }, initialScopes)

      // Assert
      expect(scopes).toEqual<BaseScopeOptions[]>([
        { method: ["existing", true] },
        { method: ["byStatus", "active"] },
        { method: ["byType", 1] },
      ])
      expect(initialScopes).toEqual([{ method: ["existing", true] }])
    })

    test("returns initial scopes when filters are missing", () => {
      // Arrange
      const initialScopes: BaseScopeOptions[] = [{ method: ["existing", true] }]

      // Act
      const scopes = buildFilterScopes(undefined, initialScopes)

      // Assert
      expect(scopes).toEqual(initialScopes)
    })

    test("ignores non-object filters", () => {
      // Arrange
      const initialScopes: BaseScopeOptions[] = []

      // Act
      const scopes = buildFilterScopes("bad", initialScopes)

      // Assert
      expect(scopes).toEqual(initialScopes)
    })
  })
})
