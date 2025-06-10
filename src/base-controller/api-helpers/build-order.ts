import { Order } from "@sequelize/core"
import { isNil } from "lodash"
import { extractArray } from "./assert-utils.js"

export type ModelOrder = Order & (
  | [string, string]
  | [string, string, string]
  | [string, string, string, string]
  | [string, string, string, string, string]
  | [string, string, string, string, string, string]
)

export function buildOrder(
  order: unknown,
  overridableOrder: ModelOrder[] = [],
  nonOverridableOrder: ModelOrder[] = [],
): ModelOrder[] | undefined {
  const typedOrder = extractArray<ModelOrder>(order)

  if (isNil(typedOrder)) {
    return [...nonOverridableOrder, ...overridableOrder]
  }

  return [...nonOverridableOrder, ...typedOrder, ...overridableOrder]
}
