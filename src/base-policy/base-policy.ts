import { Model, Attributes, FindOptions, literal, ModelStatic, ScopeOptions } from "@sequelize/core"

import { Path, deepPick } from "@/utils/deep-pick.js"

export { type Path }

export type Actions = "show" | "create" | "update" | "destroy"
export const NO_RECORDS_SCOPE = Object.freeze({ where: literal("1 = 0") })
export const ALL_RECORDS_SCOPE = Object.freeze({})

// See api/node_modules/sequelize/types/model.d.ts -> Model -> scope
export type BaseScopeOptions = string | ScopeOptions

export const POLICY_SCOPE_NAME = "policyScope"

type AllArgsButFirstOne<T extends unknown[]> = T extends [unknown, ...infer Rest] ? Rest : never

/**
 * See PolicyFactory below for policy with scope helpers
 */
export class BasePolicy<M extends Model, U extends Model> {
  readonly user: U
  readonly record: M

  constructor(user: U, record: M) {
    this.user = user
    this.record = record
  }

  show(): boolean {
    return false
  }

  create(): boolean {
    return false
  }

  update(): boolean {
    return false
  }

  destroy(): boolean {
    return false
  }

  static policyScope<TModel extends Model, TUser extends Model>(
    _user: TUser,
    ..._args: unknown[]
  ): FindOptions<Attributes<TModel>> {
    throw new Error("Derived classes must implement policyScope method")
  }


  permitAttributes(record: Partial<M>): Partial<M> {
    return deepPick(record, this.permittedAttributes())
  }

  permitAttributesForCreate(record: Partial<M>): Partial<M> {
    if (this.permittedAttributesForCreate !== BasePolicy.prototype.permittedAttributesForCreate) {
      return deepPick(record, this.permittedAttributesForCreate())
    } else {
      return deepPick(record, this.permittedAttributes())
    }
  }

  permitAttributesForUpdate(record: Partial<M>): Partial<M> {
    if (this.permittedAttributesForUpdate !== BasePolicy.prototype.permittedAttributesForUpdate) {
      return deepPick(record, this.permittedAttributesForUpdate())
    } else {
      return deepPick(record, this.permittedAttributes())
    }
  }

  permittedAttributes(): Path[] {
    throw new Error("Not Implemented")
  }

  permittedAttributesForCreate(): Path[] {
    throw new Error("Not Implemented")
  }

  permittedAttributesForUpdate(): Path[] {
    throw new Error("Not Implemented")
  }

  /**
   * Add to support return policy information via this.reponse.json({ someObject, policy })
   *
   * If this method becomes complex, it should be broken out into a serializer.
   *
   * @returns a JSON representation of the policy
   */
  toJSON(): Record<Actions, boolean> {
    return {
      show: this.show(),
      create: this.create(),
      update: this.update(),
      destroy: this.destroy(),
    }
  }
}

export function PolicyFactory<M extends Model, U extends Model = Model>(modelClass: ModelStatic<M>) {
  class Policy extends BasePolicy<M, U> {
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

    static ensurePolicyScope() {
      if (Object.prototype.hasOwnProperty.call(modelClass.options.scopes, POLICY_SCOPE_NAME)) {
        return
      }

      modelClass.addScope(POLICY_SCOPE_NAME, this.policyScope.bind(modelClass))
    }
  }

  return Policy
}
