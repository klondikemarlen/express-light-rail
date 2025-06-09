import { isEmpty } from "lodash"
import { type BaseScopeOptions } from "@/base-policy/index.js"

export function buildFilterScopes<FilterOptions extends Record<string, unknown>>(
  query: Record<string, unknown>,
  initialScopes: BaseScopeOptions[] = []
): BaseScopeOptions[] {
  const filters = query.filters as FilterOptions
  const scopes = initialScopes
  if (!isEmpty(filters)) {
    Object.entries(filters).forEach(([key, value]) => {
      scopes.push({ method: [key, value] })
    })
  }
  return scopes
}
