import { DEFAULT_PER_PAGE, type Pagination } from "@/contracts/index.js"
import { determineLimit } from "@/base-controller/api-helpers/determine-limit.js"

export { DEFAULT_PER_PAGE, type Pagination } from "@/contracts/index.js"

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
