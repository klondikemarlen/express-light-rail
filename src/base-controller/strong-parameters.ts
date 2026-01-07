import { isEmpty, isPlainObject, pick } from "lodash"
import BaseApiError from "./base-api-error.js"

/**
 * Strong parameters helper for filtering request params
 * Similar to Rails ActionController::Parameters
 */
export class StrongParameters {
  private params: Record<string, any>

  constructor(params: Record<string, any>) {
    this.params = params
  }

  /**
   * Requires that a parameter is present, throws if missing
   * Rails equivalent: params.require(:user)
   *
   * @example
   * const userParams = params.require("user")
   */
  require(key: string): StrongParameters {
    const value = this.params[key]
    // Check if key exists and is not null/undefined
    // Note: Empty objects {} and arrays [] are valid, only null/undefined/missing are invalid
    if (value === null || value === undefined) {
      throw new BaseApiError(`Parameter '${key}' is required`, 400)
    }
    return new StrongParameters(value)
  }

  /**
   * Permits only specified keys
   * Rails equivalent: params.permit(:name, :email)
   *
   * @example
   * const userParams = params.require("user").permit(["name", "email"])
   */
  permit(keys: string[]): Record<string, any> {
    if (!isPlainObject(this.params)) {
      return {}
    }
    return pick(this.params, keys)
  }

  /**
   * Get the raw params object
   */
  toObject(): Record<string, any> {
    return this.params
  }

  /**
   * Get a specific parameter value
   */
  get(key: string): any {
    return this.params[key]
  }
}

export default StrongParameters
