import { BasePolicy } from "express-light-rail"

import { User } from "@example-app/models/index.js"

export class UserPolicies extends BasePolicy.PolicyFactory<User>() {
  // TODO
}

export default UserPolicies
