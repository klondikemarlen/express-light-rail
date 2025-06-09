import { isEmpty } from "lodash"
import { type BaseScopeOptions } from "@/base-policy/index.js"

export function buildFilterScopes<FilterOptions extends Record<string, unknown>>(
  filters: unknown,
  initialScopes: BaseScopeOptions[] = [],
): BaseScopeOptions[] {
  const typedFilters = filters as Partial<FilterOptions> | undefined
  const scopes = [...initialScopes]

  if (typedFilters && !isEmpty(typedFilters)) {
    Object.entries(typedFilters).forEach(([key, value]) => {
      scopes.push({ method: [key, value] })
    })
  }

  return scopes
}
