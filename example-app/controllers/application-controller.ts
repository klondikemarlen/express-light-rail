import { BaseController } from "express-light-rail"
import { Model } from "@sequelize/core"
import { type Request } from "express"

import { User } from "@example-app/models/index.js"

type ControllerRequest = Request & {
  currentUser: User
}

// Custom error for demonstration
export class RecordNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RecordNotFoundError"
  }
}

export class ApplicationController<M extends Model> extends BaseController.API<
  M,
  ControllerRequest
> {
  // Rails-style exception handling
  static rescueFrom = [
    { error: RecordNotFoundError, with: "handleNotFound" }
  ]

  // This should have been loaded in the authorization middleware
  // Currently assuming that authorization happens before this controller gets called.
  // Child controllers that are on an non-authorizable route should override this method
  // and return undefined
  get currentUser(): User {
    return this.request.currentUser
  }

  // Exception handler
  protected handleNotFound(error: RecordNotFoundError) {
    return this.render({ error: error.message }, "not_found")
  }
}
