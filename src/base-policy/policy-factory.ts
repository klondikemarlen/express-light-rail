import { Model, ModelStatic, ScopeOptions } from "@sequelize/core"

import BasePolicy from "@/base-policy/base-policy.js"

// See api/node_modules/sequelize/types/model.d.ts -> Model -> scope
export type BaseScopeOptions = string | ScopeOptions

export const POLICY_SCOPE_NAME = "policyScope"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AllArgsButFirstOne<T extends any[]> = T extends [any, ...infer Rest] ? Rest : never

export function PolicyFactory<M extends Model, U extends Model, T extends Model = M>(
  modelClass: ModelStatic<M>
) {
  const policyClass = class Policy extends BasePolicy<T, U> {
    static applyScope<P extends typeof Policy>(
      this: P,
      scopes: BaseScopeOptions[],
      user: U,
      ...extraPolicyScopeArgs: AllArgsButFirstOne<Parameters<P["policyScope"]>>
    ): ModelStatic<M> {
      this.ensurePolicyScope()
      return modelClass.withScope([
        ...scopes,
        { method: [POLICY_SCOPE_NAME, user, ...extraPolicyScopeArgs] },
      ])
    }

    /**
     * Just in time scope creation for model class.
     * TODO: to have scope creation occur at definition time, instead of execution time.
     */
    static ensurePolicyScope() {
      if (Object.prototype.hasOwnProperty.call(modelClass.options.scopes, POLICY_SCOPE_NAME)) {
        return
      }

      modelClass.addScope(POLICY_SCOPE_NAME, this.policyScope.bind(modelClass))
    }
  }

  return policyClass
}

export default PolicyFactory
