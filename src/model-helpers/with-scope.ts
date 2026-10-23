import type { Model, ModelStatic } from "@sequelize/core"

import type { ModelScope } from "@/model-helpers/model-scope.js"

/** Applies Sequelize scopes while retaining the model class's custom statics. */
export function withScope<TModelClass extends ModelStatic<Model>>(
  model: TModelClass,
  ...scopes: ModelScope<InstanceType<TModelClass>>[]
): TModelClass {
  // Keep host overrides and the model's own Sequelize runtime in control of cloning.
  return Reflect.apply(model.withScope, model, scopes) as TModelClass
}
