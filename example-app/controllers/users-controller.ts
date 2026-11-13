import isNil from "lodash/isNil.js"
import { BaseApiError } from "express-light-rail"

import { User } from "@example-app/models/index.js"
import { UsersPolicy } from "@example-app/policies/index.js"
import { ShowSerializer } from "@example-app/serializers/users/index.js"

import { ApplicationController } from "@example-app/controllers/application-controller.js"

export class UsersController extends ApplicationController<User> {
  async index() {
    const users = await User.findAll({
      limit: this.pagination.limit,
      offset: this.pagination.offset,
      order: [["id", "ASC"]],
    })
    const serializedUsers = ShowSerializer.perform(users)
    return this.response.json({
      users: serializedUsers,
    })
  }

  async show() {
    const user = await this.loadUser()
    if (isNil(user)) {
      throw new BaseApiError("not_found", "User not found", {}, 404)
    }

    const policy = this.buildPolicy(user)
    if (!policy.show()) {
      throw new BaseApiError("forbidden", "Forbidden", {}, 403)
    }

    const serializedUser = ShowSerializer.perform(user)
    return this.response.json({
      user: serializedUser,
    })
  }

  private loadUser() {
    const userId = Number(this.params.userId)
    if (!Number.isSafeInteger(userId) || userId < 1 || String(userId) !== this.params.userId) {
      return null
    }

    return User.findByPk(userId)
  }

  private buildPolicy(user: User = User.build()) {
    return new UsersPolicy(this.currentUser, user)
  }
}
