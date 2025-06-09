const MAX_PER_PAGE = 1000
const MAX_PER_PAGE_EQUIVALENT = -1

export function determineLimit(perPage: number): number {
  if (perPage === MAX_PER_PAGE_EQUIVALENT) {
    return MAX_PER_PAGE
  }

  return Math.max(1, Math.min(perPage, MAX_PER_PAGE))
}
