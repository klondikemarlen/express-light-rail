import { Attributes, Model, WhereOptions } from "@sequelize/core"

export function buildWhere<TModel extends Model>(
  query: Record<string, unknown>,
  overridableOptions: WhereOptions<Attributes<TModel>> = {},
  nonOverridableOptions: WhereOptions<Attributes<TModel>> = {}
): WhereOptions<Attributes<TModel>> {
  const queryWhere = query.where as WhereOptions<Attributes<TModel>>
  return {
    ...overridableOptions,
    ...queryWhere,
    ...nonOverridableOptions,
  } as WhereOptions<Attributes<TModel>>
}
