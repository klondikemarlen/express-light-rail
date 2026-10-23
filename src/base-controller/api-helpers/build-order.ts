import { Order } from "@sequelize/core"
import lodash from "lodash"

import { type ModelOrder as BrowserModelOrder } from "@/contracts/index.js"
import { extractArray } from "@/base-controller/api-helpers/assert-utils.js"

const { dropRight, uniqBy } = lodash

export type ModelOrder = Order & BrowserModelOrder

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
