import {
  Model,
  type Attributes,
  type FindOptions,
  type ModelStatic,
} from "@sequelize/core"

type BaseModelScopes<TModel extends Model> = Parameters<
  ModelStatic<TModel>["withScope"]
>[0]

type ReloadWithScopeOptions<TModel extends Model> = Omit<
  FindOptions<Attributes<TModel>>,
  "raw" | "rejectOnEmpty" | "where"
> & {
  raw?: false
}

type BaseModelStatic<TModel extends Model> = ModelStatic<TModel> & {
  withScope(scopes?: BaseModelScopes<TModel>): BaseModelStatic<TModel>
}

export abstract class BaseModel<
  TModelAttributes extends object = object,
  TCreationAttributes extends object = TModelAttributes,
> extends Model<TModelAttributes, TCreationAttributes> {
  static withScope<
    TModel extends Model,
    TStatic extends BaseModelStatic<TModel>,
  >(
    this: TStatic,
    scopes?: BaseModelScopes<TModel>,
  ): TStatic {
    return Model.withScope.call(this, scopes) as TStatic
  }

  /**
   * Finds and returns a new instance through the requested scope.
   * This does not mutate the instance the method is called on.
   */
  async reloadWithScope(
    scopes: BaseModelScopes<this>,
    options: ReloadWithScopeOptions<this> = {},
  ): Promise<this> {
    const model = this.constructor as BaseModelStatic<this>
    const scopedModel = model.withScope(scopes)

    return scopedModel.findOne({
      ...options,
      where: this.where(),
      rejectOnEmpty: true,
    })
  }
}
