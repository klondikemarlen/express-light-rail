import { Order } from "@sequelize/core"
import { dropRight, uniqBy } from "lodash"

import { extractArray } from "./assert-utils.js"

export type ModelOrder = Order &
  (
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
  )

export function buildOrder(
  order: unknown,
  overridableOrder: ModelOrder[] = [],
  nonOverridableOrder: ModelOrder[] = []
): ModelOrder[] | undefined {
  const typedOrder = extractArray<ModelOrder>(order)

  if (typedOrder === undefined) {
    return [...nonOverridableOrder, ...overridableOrder]
  }

  const orderedOptions = [...nonOverridableOrder, ...typedOrder, ...overridableOrder]
  return uniqBy(orderedOptions, (orderItem) => {
    const orderExcludingDirection = dropRight(orderItem)
    return orderExcludingDirection.join(".").toLowerCase()
  })
}
