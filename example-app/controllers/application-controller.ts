import type { Model } from "@sequelize/core"
import { BaseController } from "express-light-rail"
import type { Request } from "express"
import isNil from "lodash/isNil.js"

import type { User } from "@example-app/models/user.js"

export class ApplicationController<TModel extends Model = never> extends BaseController<
  TModel,
  Request & { currentUser?: User }
> {
  protected get currentUser(): User {
    const currentUser = this.request.currentUser
    if (isNil(currentUser)) throw new Error("Current user has not been loaded")

    return currentUser
  }
}
