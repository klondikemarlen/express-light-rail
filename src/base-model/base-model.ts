import {
  Model,
  type Attributes,
  type FindOptions,
  type ModelStatic,
  type ScopeOptions,
  type WhereOptions,
} from "@sequelize/core"

type BaseModelScopes<TModel extends Model> =
  | string
  | ScopeOptions
  | readonly (string | ScopeOptions)[]
  | WhereOptions<Attributes<TModel>>
  | null
  | undefined

type ReloadWithScopeOptions<TModel extends Model> = Omit<
  FindOptions<Attributes<TModel>>,
  "plain" | "raw" | "rejectOnEmpty" | "where"
> & {
  plain?: true
  raw?: false
}

export abstract class BaseModel<
  TModelAttributes extends object = object,
  TCreationAttributes extends object = TModelAttributes,
> extends Model<TModelAttributes, TCreationAttributes> {
  static withScope<TStatic extends ModelStatic<Model>>(
    this: TStatic,
    ...scopes: BaseModelScopes<InstanceType<TStatic>>[]
  ): TStatic {
    // Sequelize supports consecutive scopes at runtime, but declares only one argument.
    return Reflect.apply(Model.withScope, this, scopes) as TStatic
  }

  /**
   * Finds and returns a new instance through the requested scope.
   * This does not mutate the instance the method is called on.
   */
  async reloadWithScope(
    scopes: BaseModelScopes<this>,
    options: ReloadWithScopeOptions<this> = {},
  ): Promise<this> {
    const model = this.constructor as ModelStatic<this>
    const scopedModel = model.withScope(scopes)

    return scopedModel.findOne({
      ...options,
      where: this.where(),
      rejectOnEmpty: true,
      raw: false,
      plain: true,
    })
  }
}
