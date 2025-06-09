import { buildFilterScopes } from "@/base-controller/api-helpers/index.js"
import { type BaseScopeOptions } from "@/base-policy/index.js"

describe("buildFilterScopes", () => {
  function buildQuery(query: Record<string, unknown> = {}) {
    return query
  }

  test("adds filters as scopes", () => {
    const scopes = buildFilterScopes(buildQuery({ filters: { byStatus: "active", byType: 1 } }), [{ method: ["existing", true] }])
    expect(scopes).toEqual<BaseScopeOptions[]>([
      { method: ["existing", true] },
      { method: ["byStatus", "active"] },
      { method: ["byType", 1] },
    ])
  })

  test("returns initial scopes when no filters", () => {
    const scopes = buildFilterScopes(buildQuery(), [{ method: ["existing", true] }])
    expect(scopes).toEqual([{ method: ["existing", true] }])
  })
})
