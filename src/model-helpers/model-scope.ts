import type { Attributes, FindOptions, Model, ScopeOptions } from "@sequelize/core"

type ScopeDefinition<TModel extends Model> = string | ScopeOptions | FindOptions<Attributes<TModel>>

export type ModelScope<TModel extends Model> =
  | ScopeDefinition<TModel>
  | readonly ScopeDefinition<TModel>[]
  | null
  | undefined
