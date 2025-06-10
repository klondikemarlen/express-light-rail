import { determineLimit } from "./determine-limit.js"

const DEFAULT_PER_PAGE = 10

export function buildPagination(query: Record<string, unknown>): {
  page: number
  perPage: number
  limit: number
  offset: number
} {
  const page = parseInt(query.page?.toString() || "") || 1
  const perPage = parseInt(query.perPage?.toString() || "") || DEFAULT_PER_PAGE
  const limit = determineLimit(perPage)
  const offset = (page - 1) * limit

  return {
    page,
    perPage,
    limit,
    offset,
  }
}
