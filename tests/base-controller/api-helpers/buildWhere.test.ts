import { buildWhere } from "@/base-controller/api-helpers/index.js"

describe("buildWhere", () => {
  function buildQuery(query: Record<string, unknown> = {}) {
    return query
  }

  test("merges overridable, query, and non-overridable options", () => {
    const result = buildWhere(buildQuery({ where: { name: "bob", archived: true } }), { archived: false }, { id: 5 })
    expect(result).toEqual({ archived: true, name: "bob", id: 5 })
  })

  test("non-overridable options win", () => {
    const result = buildWhere(buildQuery({ where: { archived: true } }), { archived: false }, { archived: false })
    expect(result.archived).toBe(false)
  })
})
