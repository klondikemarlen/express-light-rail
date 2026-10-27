import { BaseApiError, BasePolicy, type PolicyActions } from "express-light-rail"
import type { Model } from "@sequelize/core"

import type { User } from "@example-app/models/user.js"

export class ApplicationPolicy<TModel extends Model> extends BasePolicy<TModel, User> {
  authorize(action: PolicyActions): void {
    if (!this[action]()) {
      throw new BaseApiError("forbidden", "Forbidden", {}, 403)
    }
  }

  override show(): boolean {
    return true
  }

  override create(): boolean {
    return true
  }
}
