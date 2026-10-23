import type { Attributes, FindOptions, Model, ScopeOptions } from "@sequelize/core"

type InstanceScopeOptions<TModel extends Model> = Omit<
  FindOptions<Attributes<TModel>>,
  "plain" | "raw"
> & {
  plain?: never
  raw?: false
}

type ScopeDefinition<TModel extends Model> = string | ScopeOptions | InstanceScopeOptions<TModel>

export type ModelScope<TModel extends Model> =
  | ScopeDefinition<TModel>
  | readonly ScopeDefinition<TModel>[]
  | null
  | undefined
