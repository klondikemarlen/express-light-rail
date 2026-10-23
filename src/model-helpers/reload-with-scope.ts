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
  // Sequelize exposes no public getter for the effective projection of a scoped class.
  // Read its native scope metadata without changing it, including host scope overrides.
  const scopeMetadata: unknown = Reflect.get(scopedModel, "_scope")
  if (!scopeMetadata || typeof scopeMetadata !== "object" || Array.isArray(scopeMetadata)) {
    throw new TypeError("reloadWithScope requires Sequelize model scope metadata.")
  }
  const scopeOptions = scopeMetadata as Pick<FindOptions<Attributes<TModel>>, "attributes">
  let attributes = options.attributes ?? scopeOptions.attributes
  if (attributes) {
    const primaryKeyNames = Array.from(model.modelDefinition.primaryKeysAttributeNames)
    const primaryKeyProjections: ProjectionAlias[] = primaryKeyNames.map((name) => [
      sql.attribute(name),
      name,
    ])
    if (Array.isArray(attributes)) {
      attributes = [...attributes, ...primaryKeyProjections]
    } else {
      attributes = {
        ...attributes,
        include: [...(attributes.include ?? []), ...primaryKeyProjections],
        exclude: (attributes.exclude ?? []).filter((name) => !primaryKeyNames.includes(name)),
      }
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
