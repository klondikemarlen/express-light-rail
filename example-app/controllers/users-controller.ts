import { BaseApiError } from "express-light-rail"

import { ApplicationController } from "@example-app/controllers/application-controller.js"
import { User } from "@example-app/models/index.js"
import { UserSerializer } from "@example-app/serializers/user-serializer.js"

export class UsersController extends ApplicationController<User> {
  async index(): Promise<void> {
    const users = await User.findAll({
      limit: this.pagination.limit,
      offset: this.pagination.offset,
      order: [["id", "ASC"]],
    })
    this.response.json({
      users: UserSerializer.perform(users),
    })
  }

  async show(): Promise<void> {
    const userId = this.recordId(this.params.userId)
    const user = await User.findByPk(userId)
    if (!user) throw this.notFound()

    this.response.json({
      user: UserSerializer.perform(user),
    })
  }

  private recordId(value: string | undefined): number {
    if (!value || !/^[1-9]\d*$/.test(value)) throw this.notFound()

    const id = Number(value)
    if (!Number.isSafeInteger(id)) throw this.notFound()
    return id
  }

  private notFound(): BaseApiError {
    return new BaseApiError("not_found", "User not found", {}, 404)
  }
}
