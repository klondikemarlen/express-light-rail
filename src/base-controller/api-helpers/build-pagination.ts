import { determineLimit } from "./determine-limit.js"

export const DEFAULT_PER_PAGE = 10

export type Pagination = {
  page: number
  perPage: number
  limit: number
  offset: number
}

export function buildPagination(query: Record<string, unknown>): Pagination {
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
