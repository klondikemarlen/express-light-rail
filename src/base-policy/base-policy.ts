import { Model, Attributes, FindOptions, literal, ModelStatic, ScopeOptions } from "@sequelize/core"

import { Path, deepPick } from "@/utils/deep-pick.js"

export { type Path }

export type Actions = "show" | "create" | "update" | "destroy"
export const NO_RECORDS_SCOPE = { where: literal("1 = 0") }
export const ALL_RECORDS_SCOPE = {}

// See api/node_modules/sequelize/types/model.d.ts -> Model -> scope
export type BaseScopeOptions = string | ScopeOptions

export const POLICY_SCOPE_NAME = "policyScope"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AllArgsButFirstOne<T extends any[]> = T extends [any, ...infer Rest] ? Rest : never

/**
 * See PolicyFactory below for policy with scope helpers
 */
export class BasePolicy<M extends Model, U extends Model> {
  protected user: U
  protected record: M

  protected static modelClass: ModelStatic<Model> | null = null

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

  static applyScope<P extends typeof BasePolicy, U extends Model>(
    this: P,
    scopes: BaseScopeOptions[],
    user: U,
    ...extraPolicyScopeArgs: AllArgsButFirstOne<Parameters<P["policyScope"]>>
  ) {
    if (this.modelClass === null) {
      throw new Error("modelClass is not set")
    }

    this.ensurePolicyScope()
    return this.modelClass.withScope([
      ...scopes,
      { method: [POLICY_SCOPE_NAME, user, ...extraPolicyScopeArgs] },
    ])
  }

  static policyScope<M extends Model, U extends Model>(
    // @ts-expect-error - ignoring unused vars as needed for inheritance
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    user: U,
    // @ts-expect-error - ignoring unused vars as needed for inheritance
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...args: unknown[]
  ): FindOptions<Attributes<M>> {
    throw new Error("Derived classes must implement policyScope method")
  }

  /**
   * Just in time scope creation for model class.
   * TODO: to have scope creation occur at definition time, instead of execution time.
   */
  static ensurePolicyScope() {
    if (this.modelClass === null) {
      throw new Error("modelClass is not set")
    }

    if (Object.prototype.hasOwnProperty.call(this.modelClass.options.scopes, POLICY_SCOPE_NAME)) {
      return
    }

    this.modelClass.addScope(POLICY_SCOPE_NAME, this.policyScope.bind(this.modelClass))
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

export default BasePolicy
