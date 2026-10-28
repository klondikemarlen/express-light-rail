import type { Model } from "@sequelize/core"
import { BaseController } from "express-light-rail"
import type { NextFunction, Request, Response } from "express"

import { authenticateUser } from "@example-app/authentication.js"
import type { User } from "@example-app/models/user.js"

export class ApplicationController<TModel extends Model = never> extends BaseController<
  TModel,
  Request & { currentUser: User }
> {
  static override createActionHandler(
    action: Parameters<typeof BaseController.createActionHandler>[0]
  ) {
    const actionHandler = super.createActionHandler(action)
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const currentUser = await authenticateUser(request, response)
        Object.assign(request, {
          currentUser,
        })
        await actionHandler(request, response, next)
      } catch (error: unknown) {
        next(error)
      }
    }
  }

  protected get currentUser(): User {
    return this.request.currentUser
  }
}
