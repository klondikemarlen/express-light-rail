import type { Model } from "@sequelize/core"
import { BaseApiError, BaseController } from "express-light-rail"
import type { Request } from "express"
import isNil from "lodash/isNil.js"

import { AUTHENTICATION_MODE, AUTH0_SUBJECT_USERS } from "@example-app/config.js"
import { User } from "@example-app/models/user.js"

export class ApplicationController<TModel extends Model = never> extends BaseController<
  TModel,
  Request & { currentUser?: User }
> {
  protected override async beforeAction(): Promise<void> {
    let username: string | undefined
    if (AUTHENTICATION_MODE === "demo") {
      username = this.request.get("x-user-id")
    } else {
      const subject = this.request.auth?.payload.sub
      if (subject) username = AUTH0_SUBJECT_USERS.get(subject)
    }

    if (!username) throw this.authenticationError()

    const currentUser = await User.findOne({
      where: {
        username,
      },
    })
    if (isNil(currentUser)) throw this.authenticationError()

    this.request.currentUser = currentUser
  }

  protected get currentUser(): User {
    const currentUser = this.request.currentUser
    if (isNil(currentUser)) throw new Error("Current user has not been loaded")

    return currentUser
  }

  private authenticationError(): BaseApiError {
    if (AUTHENTICATION_MODE === "demo") {
      return new BaseApiError("unauthorized", "Authentication required", {}, 401)
    }

    return new BaseApiError("forbidden", "Account is not provisioned", {}, 403)
  }
}
