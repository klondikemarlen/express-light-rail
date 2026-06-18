import { PolicyFactory } from "express-light-rail"

import { User } from "@example-app/models/index.js"

const UserPolicy = PolicyFactory<User, User>(User)

export class UserPolicies extends UserPolicy {
  // TODO
}
