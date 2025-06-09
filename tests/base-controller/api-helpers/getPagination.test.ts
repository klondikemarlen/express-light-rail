import { getPagination } from "@/base-controller/api-helpers/index.js"

describe("getPagination", () => {
  function buildQuery(query: Record<string, unknown> = {}) {
    return query
  }

  test("uses defaults when query params are missing", () => {
    const pagination = getPagination(buildQuery())
    expect(pagination).toEqual({ page: 1, perPage: 10, limit: 10, offset: 0 })
  })

  test("caps perPage at 1000", () => {
    const { limit, offset } = getPagination(buildQuery({ page: "2", perPage: "5000" }))
    expect(limit).toBe(1000)
    expect(offset).toBe(1000) // (page-1) * limit -> 1 * 1000
  })

  test("uses MAX_PER_PAGE when perPage is -1", () => {
    const { limit } = getPagination(buildQuery({ perPage: "-1" }))
    expect(limit).toBe(1000)
  })
})
