import { Model, Attributes, FindOptions, literal } from "@sequelize/core"

import { Path, deepPick } from "@/utils/deep-pick.js"

export type Actions = "show" | "create" | "update" | "destroy"
export const NO_RECORDS_SCOPE = { where: literal("1 = 0") }
export const ALL_RECORDS_SCOPE = {}

/**
 * See PolicyFactory below for policy with scope helpers
 */
export class BasePolicy<M extends Model, U extends Model> {
  protected user: U
  protected record: M

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
