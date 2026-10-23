import {
  sql,
  type Model,
  type Attributes,
  type FindOptions,
  type ModelStatic,
  type ProjectionAlias,
} from "@sequelize/core"
import lodash from "lodash"

import type { ModelScope } from "@/model-helpers/model-scope.js"
import { withScope } from "@/model-helpers/with-scope.js"

const { isEqual } = lodash

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
  const identity = record.where()
  const primaryKeyNames = Array.from(model.modelDefinition.primaryKeysAttributeNames)
  const primaryKeyProjections: ProjectionAlias[] = primaryKeyNames.map((name) => [
    sql.attribute(name),
    name,
  ])
  let attributes = options.attributes
  if (Array.isArray(attributes)) {
    attributes = [...attributes, ...primaryKeyProjections]
  } else if (attributes) {
    attributes = {
      ...attributes,
      include: [...(attributes.include ?? []), ...primaryKeyProjections],
      exclude: (attributes.exclude ?? []).filter((name) => !primaryKeyNames.includes(name)),
    }
  }
  const findOptions: FindOptions<Attributes<TModel>> & {
    plain: true
    raw: false
    rejectOnEmpty: true
  } = {
    ...options,
    attributes,
    where: identity,
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

  if (!isEqual(reloaded.where(), identity)) {
    throw new TypeError(
      "reloadWithScope expected the original primary key, but a model hook changed the find result."
    )
  }

  return reloaded
}
