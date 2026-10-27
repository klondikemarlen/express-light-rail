import type { Model } from "@sequelize/core"
import type { Request } from "express"
import { BaseController } from "express-light-rail"

import type { User } from "@example-app/models/user.js"

export class ApplicationController<TModel extends Model = never> extends BaseController<
  TModel,
  Request & { currentUser: User }
> {
  protected get currentUser(): User {
    return this.request.currentUser
  }
}
