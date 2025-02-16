import { Model } from "@sequelize/core"
import { BasePolicy } from "express-light-rail"

import { User } from "@example-app/models/index.js"

export class ApplicationPolicy<M extends Model> extends BasePolicy.BasePolicy<M, User> {
  // TODO
}

export default ApplicationPolicy
