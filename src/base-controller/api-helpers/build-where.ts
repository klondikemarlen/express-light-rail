import { Attributes, Model, WhereOptions } from "@sequelize/core"
import { extractRecord } from "./assert-utils.js"

export function buildWhere<TModel extends Model>(
  where: unknown,
  overridableOptions: WhereOptions<Attributes<TModel>> = {},
  nonOverridableOptions: WhereOptions<Attributes<TModel>> = {},
): WhereOptions<Attributes<TModel>> {
  const typedWhere = extractRecord<WhereOptions<Attributes<TModel>>>(where)

  return {
    ...overridableOptions,
    ...(typedWhere || {}),
    ...nonOverridableOptions,
  } as WhereOptions<Attributes<TModel>>
}
