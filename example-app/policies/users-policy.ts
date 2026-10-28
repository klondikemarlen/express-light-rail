import type { Path } from "express-light-rail"

import type { User } from "@example-app/models/index.js"

import { ApplicationPolicy } from "@example-app/policies/application-policy.js"

export class UsersPolicy extends ApplicationPolicy<User> {
  override permittedAttributes(): Path[] {
    return []
  }
}
