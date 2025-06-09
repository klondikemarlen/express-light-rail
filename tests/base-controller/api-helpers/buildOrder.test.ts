import { buildOrder } from "@/base-controller/api-helpers/index.js"

describe("buildOrder", () => {
  function buildQuery(query: Record<string, unknown> = {}) {
    return query
  }

  test("returns default order when query has no order", () => {
    const order = buildOrder(buildQuery(), [["name", "asc"]], [["id", "desc"]])
    expect(order).toEqual([["id", "desc"], ["name", "asc"]])
  })

  test("inserts query order between non-overridable and overridable", () => {
    const order = buildOrder(buildQuery({ order: [["createdAt", "desc"]] }), [["name", "asc"]], [["id", "desc"]])
    expect(order).toEqual([["id", "desc"], ["createdAt", "desc"], ["name", "asc"]])
  })
})
