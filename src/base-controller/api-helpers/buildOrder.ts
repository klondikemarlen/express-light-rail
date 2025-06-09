import { isNil } from "lodash"
import { type ModelOrder } from "./types.js"

export function buildOrder(
  query: Record<string, unknown>,
  overridableOrder: ModelOrder[] = [],
  nonOverridableOrder: ModelOrder[] = []
): ModelOrder[] | undefined {
  const orderQuery = query.order as unknown as ModelOrder[] | undefined

  if (isNil(orderQuery)) {
    return [...nonOverridableOrder, ...overridableOrder]
  }

  return [...nonOverridableOrder, ...orderQuery, ...overridableOrder]
}
