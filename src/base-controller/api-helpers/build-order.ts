import { Order } from "@sequelize/core"
import { isNil } from "lodash"

export type ModelOrder = Order & (
  | [string, string]
  | [string, string, string]
  | [string, string, string, string]
  | [string, string, string, string, string]
  | [string, string, string, string, string, string]
)

export function buildOrder(
  order: ModelOrder[] | undefined,
  overridableOrder: ModelOrder[] = [],
  nonOverridableOrder: ModelOrder[] = [],
): ModelOrder[] | undefined {
  if (isNil(order)) {
    return [...nonOverridableOrder, ...overridableOrder]
  }

  return [...nonOverridableOrder, ...order, ...overridableOrder]
}
