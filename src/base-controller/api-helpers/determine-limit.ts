import { MAX_PER_PAGE, MAX_PER_PAGE_EQUIVALENT } from "@/contracts/index.js"

export { MAX_PER_PAGE, MAX_PER_PAGE_EQUIVALENT } from "@/contracts/index.js"

export function determineLimit(perPage: number): number {
  if (perPage === MAX_PER_PAGE_EQUIVALENT) {
    return MAX_PER_PAGE
  }

  return Math.max(1, Math.min(perPage, MAX_PER_PAGE))
}
