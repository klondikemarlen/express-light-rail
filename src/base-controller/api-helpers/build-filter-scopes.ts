import { isEmpty } from "lodash"
import { type BaseScopeOptions } from "@/base-policy/index.js"
import { extractRecord } from "./assert-utils.js"

export function buildFilterScopes<FilterOptions extends Record<string, unknown>>(
  filters: unknown,
  initialScopes: BaseScopeOptions[] = [],
): BaseScopeOptions[] {
  const typedFilters = extractRecord<FilterOptions>(filters)
  const scopes = [...initialScopes]

  if (typedFilters && !isEmpty(typedFilters)) {
    Object.entries(typedFilters).forEach(([key, value]) => {
      scopes.push({ method: [key, value] })
    })
  }

  return scopes
}
