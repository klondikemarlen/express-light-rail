import { BasePolicy } from "express-light-rail"
import type { Model } from "@sequelize/core"

import type { User } from "@example-app/models/user.js"

export class ApplicationPolicy<TModel extends Model> extends BasePolicy<TModel, User> {
  override show(): boolean {
    return true
  }
}
