import { BaseController } from "express-light-rail"

import { User } from "./../models"

type ControllerRequest = Request & {
  currentUser: User
}

export class ApplicationController extends BaseController.API {
  // This should have been loaded in the authorization middleware
  // Currently assuming that authorization happens before this controller gets called.
  // Child controllers that are on an non-authorizable route should override this method
  // and return undefined
  get currentUser(): User {
    return this.request.currentUser
  }
}
