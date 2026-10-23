import { type Model, type Attributes, type FindOptions, type ModelStatic } from "@sequelize/core"

import type { ModelScope } from "@/model-helpers/model-scope.js"
import { withScope } from "@/model-helpers/with-scope.js"

export type ReloadWithScopeOptions<TModel extends Model> = Omit<
  FindOptions<Attributes<TModel>>,
  "plain" | "raw" | "rejectOnEmpty" | "where"
> & {
  plain?: true
  raw?: false
}

/** Returns the fresh scoped instance without mutating the supplied instance. */
export async function reloadWithScope<TModel extends Model>(
  record: TModel,
  scopes: ModelScope<TModel>,
  options: ReloadWithScopeOptions<TModel> = {}
): Promise<TModel> {
  const model = record.constructor as ModelStatic<TModel>
  const scopedModel = withScope(model, scopes)
  const findOptions: FindOptions<Attributes<TModel>> & {
    plain: true
    raw: false
    rejectOnEmpty: true
  } = {
    ...options,
    where: record.where(),
    rejectOnEmpty: true,
    raw: false,
    plain: true,
  }
  const reloaded = await scopedModel.findOne(findOptions)

  if (!(reloaded instanceof model.getInitialModel())) {
    throw new TypeError(
      "reloadWithScope expected a model instance, but a model hook changed the find result shape."
    )
  }

  return reloaded
}
