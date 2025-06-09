import { Attributes, Model, WhereOptions } from "@sequelize/core"

export function buildWhere<TModel extends Model>(
  where: WhereOptions<Attributes<TModel>> | undefined,
  overridableOptions: WhereOptions<Attributes<TModel>> = {},
  nonOverridableOptions: WhereOptions<Attributes<TModel>> = {},
): WhereOptions<Attributes<TModel>> {
  return {
    ...overridableOptions,
    ...(where || {}),
    ...nonOverridableOptions,
  } as WhereOptions<Attributes<TModel>>
}
